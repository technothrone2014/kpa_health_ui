import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'orange' | 'pink' | 'teal';
  loading?: boolean;
  onClick?: () => void;
  subtitle?: string;
  footer?: React.ReactNode;
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'hover:border-blue-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'hover:border-green-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    border: 'hover:border-red-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    border: 'hover:border-yellow-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    border: 'hover:border-purple-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'hover:border-indigo-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    border: 'hover:border-orange-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'text-pink-600',
    border: 'hover:border-pink-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'text-teal-600',
    border: 'hover:border-teal-200',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
};

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue', 
  loading = false,
  onClick,
  subtitle,
  footer
}: StatCardProps) {
  const styles = colorStyles[color];

  // Format large numbers
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M';
      }
      if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K';
      }
      return val.toString();
    }
    return val;
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all duration-200 ${styles.border} ${
        onClick ? 'cursor-pointer hover:shadow-md transform hover:-translate-y-0.5' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {loading ? (
            <>
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
              {subtitle && <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>}
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-gray-900">
                {formatValue(value)}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </>
          )}
          {trend && !loading && (
            <div className="flex items-center mt-3">
              <span
                className={`inline-flex items-center text-xs font-medium ${
                  trend.isPositive 
                    ? styles.trendPositive 
                    : styles.trendNegative
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${styles.bg} flex-shrink-0`}>
          <Icon className={`h-6 w-6 ${styles.icon}`} />
        </div>
      </div>
      {footer && !loading && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  );
}
