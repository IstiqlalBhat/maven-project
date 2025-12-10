'use client';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
}

const colorMap = {
  default: 'text-amber-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  color = 'default',
}: StatsCardProps) {
  return (
    <div className="glass-card p-5">
      <p className="stat-label mb-2">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className={`stat-value ${colorMap[color]}`}>{value}</span>
        {subtitle && (
          <span className="text-gray-500 text-sm">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
