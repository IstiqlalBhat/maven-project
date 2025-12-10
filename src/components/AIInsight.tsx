'use client';

import { Lightbulb, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface DevelopmentPlan {
    playerName: string;
    level: string;
    strengths: string[];
    developmentPriorities: Array<{
        area: string;
        priority: 'High' | 'Medium' | 'Low';
        current: string;
        target: string;
        actionItems: string[];
        timeline: string;
    }>;
    realisticPath: string;
    nextSteps: string[];
    similarPitchers: string[];
}

interface AIInsightProps {
    plan: DevelopmentPlan | null;
    isLoading?: boolean;
    onGenerate: () => void;
}

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'High': return 'text-red-600 bg-red-100';
        case 'Medium': return 'text-amber-600 bg-amber-100';
        case 'Low': return 'text-green-600 bg-green-100';
        default: return 'text-gray-600 bg-gray-100';
    }
};

export default function AIInsight({ plan, isLoading, onGenerate }: AIInsightProps) {
    const [expanded, setExpanded] = useState(false);

    if (isLoading) {
        return (
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <Lightbulb className="text-amber-500" size={20} />
                    </div>
                    <h3 className="font-semibold text-gray-800">AI Insight</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="loading-spinner" />
                    <span className="ml-3 text-sm text-gray-500">Analyzing your arsenal...</span>
                </div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <Lightbulb className="text-amber-500" size={20} />
                    </div>
                    <h3 className="font-semibold text-gray-800">AI Insight</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Get personalized development recommendations based on your pitch data and MLB comparisons.
                </p>
                <button onClick={onGenerate} className="btn-primary w-full">
                    Get Development Plan
                </button>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-xl">
                    <Lightbulb className="text-amber-500" size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800">AI Development Plan</h3>
                    <p className="text-xs text-gray-500">{plan.playerName} • {plan.level}</p>
                </div>
            </div>

            {/* Strengths */}
            {plan.strengths.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-green-700 mb-2">✨ Strengths</h4>
                    <ul className="space-y-1">
                        {plan.strengths.slice(0, expanded ? undefined : 2).map((strength, i) => (
                            <li key={i} className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-green-500">
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Development Priorities */}
            {plan.developmentPriorities.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📈 Development Priorities</h4>
                    <div className="space-y-3">
                        {plan.developmentPriorities.slice(0, expanded ? undefined : 1).map((priority, i) => (
                            <div key={i} className="bg-white/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-gray-800">{priority.area}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(priority.priority)}`}>
                                        {priority.priority}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">
                                    {priority.current} → {priority.target}
                                </p>
                                {expanded && (
                                    <>
                                        <ul className="text-xs text-gray-600 space-y-1 mb-2">
                                            {priority.actionItems.map((item, j) => (
                                                <li key={j} className="pl-3 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500">
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-xs text-gray-400">Timeline: {priority.timeline}</p>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Realistic Path - Show when expanded */}
            {expanded && plan.realisticPath && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 Realistic Path</h4>
                    <p className="text-sm text-gray-600">{plan.realisticPath}</p>
                </div>
            )}

            {/* Next Steps - Show when expanded */}
            {expanded && plan.nextSteps.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">✅ Next Steps</h4>
                    <ul className="space-y-1">
                        {plan.nextSteps.map((step, i) => (
                            <li key={i} className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-amber-500">
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 transition-colors"
            >
                {expanded ? 'Show less' : 'View full plan'}
                <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>

            {/* Regenerate button */}
            <button onClick={onGenerate} className="btn-secondary w-full mt-4 text-sm">
                Regenerate Plan
            </button>
        </div>
    );
}
