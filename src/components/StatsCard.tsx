'use client';

import { useEffect, useState } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
  icon?: React.ReactNode;
}

const colorConfig = {
  default: {
    text: 'text-amber-600',
    bg: 'from-amber-50 to-amber-100/50',
    accent: 'bg-gradient-to-br from-amber-400 to-amber-500',
    glow: 'shadow-amber-200/50',
  },
  blue: {
    text: 'text-blue-600',
    bg: 'from-blue-50 to-blue-100/50',
    accent: 'bg-gradient-to-br from-blue-400 to-blue-500',
    glow: 'shadow-blue-200/50',
  },
  green: {
    text: 'text-emerald-600',
    bg: 'from-emerald-50 to-emerald-100/50',
    accent: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
    glow: 'shadow-emerald-200/50',
  },
  red: {
    text: 'text-red-600',
    bg: 'from-red-50 to-red-100/50',
    accent: 'bg-gradient-to-br from-red-400 to-red-500',
    glow: 'shadow-red-200/50',
  },
  purple: {
    text: 'text-purple-600',
    bg: 'from-purple-50 to-purple-100/50',
    accent: 'bg-gradient-to-br from-purple-400 to-purple-500',
    glow: 'shadow-purple-200/50',
  },
  orange: {
    text: 'text-orange-600',
    bg: 'from-orange-50 to-orange-100/50',
    accent: 'bg-gradient-to-br from-orange-400 to-orange-500',
    glow: 'shadow-orange-200/50',
  },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  color = 'default',
  icon,
}: StatsCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = colorConfig[color];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`glass-card p-5 relative overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {/* Decorative accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.accent} opacity-80`} />

      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} opacity-30 pointer-events-none`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="stat-label">{title}</p>
          {icon && (
            <div className={`w-8 h-8 rounded-lg ${config.accent} flex items-center justify-center text-white shadow-lg ${config.glow}`}>
              {icon}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`stat-value ${config.text}`}>{value}</span>
          {subtitle && (
            <span className="text-gray-500 text-sm font-medium">{subtitle}</span>
          )}
        </div>
      </div>

      {/* Subtle shine effect */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
    </div>
  );
}
