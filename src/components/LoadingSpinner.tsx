import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ size = 32, className = '' }: LoadingSpinnerProps) {
  return (
    <div className="flex justify-center items-center">
      <Loader2 
        className={`animate-spin ${className}`}
        size={size}
      />
    </div>
  );
}