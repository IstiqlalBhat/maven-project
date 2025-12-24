'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
    timestamp?: Date;
    id?: string;
}

interface PitcherContext {
    id: number;
    name: string;
    level?: string;
}

interface AIChatProps {
    pitcher?: PitcherContext;
}

export default function AIChat({ pitcher }: AIChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeAiMessageId, setActiveAiMessageId] = useState<string | null>(null);
    const [renderedAiText, setRenderedAiText] = useState('');
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastAnimatedMessageId = useRef<string | null>(null);
    // Track initial mount to prevent page scroll on load
    const isInitialMount = useRef(true);
    // Track message IDs loaded from storage - these should NOT be re-animated
    const loadedMessageIds = useRef<Set<string>>(new Set());
    // Throttle scroll updates to prevent layout thrashing during animation
    const scrollRAF = useRef<number | null>(null);

    // Storage key depends on pitcher context
    // Using sessionStorage instead of localStorage for security:
    // - Data is cleared when browser session ends
    // - Not persistent across tabs/windows
    // - Reduces risk of sensitive conversation data exposure
    const storageKey = `maven_chat_${pitcher?.id || 'general'}`;

    const createMessageId = useCallback(() => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }, []);

    const getMessageText = useCallback((message: ChatMessage) => {
        return message.parts.map(part => part.text).join('\n\n');
    }, []);

    // Load messages from session storage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Convert string timestamps back to Date objects
                const rehydrated = parsed.map((m: any) => {
                    const id = m.id || createMessageId();
                    // Track loaded message IDs to prevent re-animation
                    loadedMessageIds.current.add(id);
                    return {
                        ...m,
                        id,
                        timestamp: m.timestamp ? new Date(m.timestamp) : undefined
                    };
                });
                setMessages(rehydrated);
            } catch (e) {
                console.error('Failed to parse chat history', e);
            }
        }
    }, [createMessageId, storageKey]);

    // Save messages to session storage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            sessionStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages, storageKey]);

    // Auto-scroll within CHAT CONTAINER only - doesn't affect dashboard scroll
    const scrollToBottom = useCallback(() => {
        if (!autoScrollEnabled) return;
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [autoScrollEnabled]);

    // Only scroll on new messages AFTER initial mount (prevents page jump on load)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Keep chat pinned during AI response animation (contained to chat only)
    // Uses requestAnimationFrame to throttle scroll updates and prevent layout thrashing
    useEffect(() => {
        if (!activeAiMessageId || !autoScrollEnabled) return;

        // Cancel any pending scroll to prevent stacking
        if (scrollRAF.current !== null) {
            cancelAnimationFrame(scrollRAF.current);
        }

        // Schedule scroll for next animation frame
        scrollRAF.current = requestAnimationFrame(() => {
            scrollToBottom();
            scrollRAF.current = null;
        });

        return () => {
            if (scrollRAF.current !== null) {
                cancelAnimationFrame(scrollRAF.current);
                scrollRAF.current = null;
            }
        };
    }, [activeAiMessageId, renderedAiText, autoScrollEnabled, scrollToBottom]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Animate the latest AI response to feel like text streaming
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'model') {
            setActiveAiMessageId(null);
            setRenderedAiText('');
            return;
        }

        const messageId = lastMessage.id || (lastMessage.timestamp ? new Date(lastMessage.timestamp).getTime().toString() : createMessageId());

        // Skip animation for messages already animated OR loaded from storage
        if (lastAnimatedMessageId.current === messageId || loadedMessageIds.current.has(messageId)) {
            return;
        }

        lastAnimatedMessageId.current = messageId;
        setActiveAiMessageId(messageId);

        const fullText = getMessageText(lastMessage);
        if (!fullText) {
            setRenderedAiText('');
            return;
        }

        let index = 0;
        setRenderedAiText('');

        const interval = window.setInterval(() => {
            index = Math.min(index + 2, fullText.length);
            setRenderedAiText(fullText.slice(0, index));

            if (index >= fullText.length) {
                window.clearInterval(interval);
                setActiveAiMessageId(null);
            }
        }, 14);

        return () => {
            window.clearInterval(interval);
        };
    }, [createMessageId, getMessageText, messages]);

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            parts: [{ text: inputValue.trim() }],
            timestamp: new Date(),
            id: createMessageId()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);
        setError(null);
        setActiveAiMessageId(null);
        setRenderedAiText('');
        setAutoScrollEnabled(true);

        try {
            const { authPost } = await import('@/lib/auth-fetch');
            const response = await authPost('/api/chat', {
                messages: newMessages.map(m => ({
                    role: m.role,
                    parts: m.parts
                })),
                pitcherId: pitcher?.id
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const aiMessage: ChatMessage = {
                ...data.message,
                timestamp: new Date(),
                id: data.message?.id || createMessageId()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setError(null);
        setActiveAiMessageId(null);
        setRenderedAiText('');
        setAutoScrollEnabled(true);
        sessionStorage.removeItem(storageKey);
    };

    const handleMessagesScroll = () => {
        const el = messagesContainerRef.current;
        if (!el) return;
        const threshold = 64;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setAutoScrollEnabled(distanceFromBottom <= threshold);
    };

    return (
        <div className="glass-card p-0 flex flex-col h-[520px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-white/30 pointer-events-none" />
            <div className="absolute -right-14 -top-14 w-48 h-48 bg-amber-200/40 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -left-10 bottom-0 w-40 h-40 bg-amber-100/35 blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between p-4 border-b border-white/30 bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg">
                        <MessageCircle className="text-white" size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            Maven AI
                            <Sparkles className="text-amber-500" size={14} />
                        </h3>
                        <p className="text-xs text-gray-500">
                            {pitcher ? `Coaching ${pitcher.name}` : 'Your pitching coach'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border ${isLoading
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        {isLoading ? 'Thinking' : 'Online'}
                    </div>
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600"
                            title="Clear Chat"
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Container */}
            <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="relative flex-1 overflow-y-auto p-4 space-y-4 chat-messages-container"
                role="log"
                aria-live="polite"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="p-4 bg-amber-50 rounded-2xl mb-4 shadow-inner">
                            <Sparkles className="text-amber-500" size={32} />
                        </div>
                        <h4 className="font-semibold text-gray-700 mb-2">Ask Maven AI</h4>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Get personalized pitching insights, development advice, or analyze your mechanics.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {['What should I work on?', 'Compare my velocity', 'Suggest drills'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInputValue(suggestion)}
                                    className="px-3 py-1.5 text-xs bg-white/80 hover:bg-white rounded-full border border-amber-200 text-amber-700 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const messageId = message.id || (message.timestamp ? new Date(message.timestamp).getTime().toString() : `${index}`);
                        const isActiveAi = message.role === 'model' && messageId === activeAiMessageId;
                        const textToRender = isActiveAi ? renderedAiText : getMessageText(message);

                        return (
                            <div
                                key={messageId}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${message.role === 'user'
                                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white chat-bubble-user border-amber-200/60'
                                        : 'bg-white/80 backdrop-blur-sm border-white/60 text-gray-700 chat-bubble-ai'
                                        }`}
                                >
                                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isActiveAi ? 'streaming-text' : ''}`}>
                                        {textToRender}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start animate-in">
                        <div className="bg-white/80 backdrop-blur-sm border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-sm">
                            <div className="typing-indicator mt-0.5">
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                            </div>
                            <div className="ai-loader w-48">
                                <div className="ai-loader-line" />
                                <div className="ai-loader-line sm" />
                                <div className="ai-loader-line xs" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600">
                            {error}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="relative p-4 border-t border-white/30 bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-2 rounded-2xl bg-white/80 border border-white/60 shadow-inner px-3 py-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask about your pitching..."
                        className="flex-1 bg-transparent rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-0"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-white disabled:opacity-50 hover:shadow-lg transition-all disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
