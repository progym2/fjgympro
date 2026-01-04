import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rounded';
  animation?: 'pulse' | 'shimmer' | 'wave';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'default',
  animation = 'shimmer'
}) => {
  const baseClasses = 'bg-muted/50';
  
  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-xl'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-muted/30 before:to-transparent before:animate-shimmer',
    wave: 'relative overflow-hidden after:absolute after:inset-0 after:translate-x-[-100%] after:bg-gradient-to-r after:from-transparent after:via-foreground/5 after:to-transparent after:animate-[shimmer_1.5s_ease-in-out_infinite]'
  };

  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )} 
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-card/80 backdrop-blur-md rounded-xl border border-border/50 p-4 space-y-3", className)}>
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" variant="rounded" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  </div>
);

export const SkeletonExerciseCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden", className)}>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-5 w-16 rounded-full" variant="rounded" />
          <Skeleton className="h-4 w-4" variant="circular" />
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  </div>
);

export const SkeletonStatCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 flex flex-col items-center gap-2", className)}>
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-12" />
  </div>
);

export const SkeletonListItem: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("flex items-center gap-3 p-3 bg-card/80 rounded-lg border border-border/50", className)}>
    <Skeleton className="h-10 w-10" variant="circular" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-8 w-20 rounded-lg" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({ rows = 5, className }) => (
  <div className={cn("space-y-2", className)}>
    {/* Header */}
    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3 border-b border-border/30">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    ))}
  </div>
);

export default Skeleton;
