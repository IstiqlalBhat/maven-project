'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
    timestamp?: Date;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Storage key depends on pitcher context
    // Using sessionStorage instead of localStorage for security:
    // - Data is cleared when browser session ends
    // - Not persistent across tabs/windows
    // - Reduces risk of sensitive conversation data exposure
    const storageKey = `maven_chat_${pitcher?.id || 'general'}`;

    // Load messages from session storage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Convert string timestamps back to Date objects
                const rehydrated = parsed.map((m: any) => ({
                    ...m,
                    timestamp: m.timestamp ? new Date(m.timestamp) : undefined
                }));
                setMessages(rehydrated);
            } catch (e) {
                console.error('Failed to parse chat history', e);
            }
        }
    }, [storageKey]);

    // Save messages to session storage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            sessionStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages, storageKey]);

    // Auto-scroll to bottom on new messages
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            parts: [{ text: inputValue.trim() }],
            timestamp: new Date()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);
        setError(null);

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
                timestamp: new Date()
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
        sessionStorage.removeItem(storageKey);
    };

    return (
        <div className="glass-card p-0 flex flex-col h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages-container">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="p-4 bg-amber-50 rounded-2xl mb-4">
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
                                    className="px-3 py-1.5 text-xs bg-white/70 hover:bg-white rounded-full border border-amber-200 text-amber-700 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white chat-bubble-user'
                                    : 'bg-white/80 backdrop-blur-sm border border-white/50 text-gray-700 chat-bubble-ai'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.parts[0].text}</p>
                            </div>
                        </div>
                    ))
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                            <Loader2 className="animate-spin text-amber-500" size={16} />
                            <span className="text-sm text-gray-500">
                                Thinking...
                            </span>
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
            <div className="p-4 border-t border-white/20 bg-white/30">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask about your pitching..."
                        className="flex-1 bg-white/80 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
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
