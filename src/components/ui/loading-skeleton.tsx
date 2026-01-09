import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rounded';
}

const Skeleton: React.FC<SkeletonProps> = memo(({ className, variant = 'default' }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted/50',
        variant === 'circular' && 'rounded-full',
        variant === 'rounded' && 'rounded-lg',
        variant === 'default' && 'rounded-md',
        className
      )}
    />
  );
});
Skeleton.displayName = 'Skeleton';

// Menu button skeleton for home screen - faster animation
export const MenuButtonSkeleton = memo(() => (
  <div className="w-20 h-24 sm:w-24 sm:h-28 bg-muted/20 animate-pulse rounded-xl" />
));
MenuButtonSkeleton.displayName = 'MenuButtonSkeleton';

// Card skeleton for dashboard items
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-card/50 border border-border/30 rounded-xl p-4 space-y-3', className)}>
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" className="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

// Stats card skeleton
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-card/50 border border-border/30 rounded-xl p-4 space-y-2">
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-2 w-24" />
  </div>
);

// List item skeleton
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 bg-card/30 rounded-lg">
    <Skeleton variant="circular" className="w-8 h-8" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="w-6 h-6" />
  </div>
);

// Profile skeleton
export const ProfileSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" className="w-20 h-20" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="space-y-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <Skeleton className="h-10 w-full mt-4" />
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2">
    <div className="flex gap-2 p-3 bg-muted/30 rounded-t-lg">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex gap-2 p-3 border-b border-border/20">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    ))}
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    {/* Stats row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
    {/* Main content */}
    <div className="grid md:grid-cols-2 gap-4">
      <CardSkeleton />
      <CardSkeleton />
    </div>
    {/* List */}
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Page loading skeleton with animation
export const PageLoadingSkeleton: React.FC<{ type?: 'dashboard' | 'list' | 'form' | 'profile' }> = ({ 
  type = 'dashboard' 
}) => {
  const skeletonMap = {
    dashboard: <DashboardSkeleton />,
    list: (
      <div className="space-y-2 p-4">
        {[...Array(8)].map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    ),
    form: (
      <div className="p-4">
        <FormSkeleton />
      </div>
    ),
    profile: (
      <div className="p-4">
        <ProfileSkeleton />
      </div>
    ),
  };

  return (
    <div className="animate-fade-in">
      {skeletonMap[type]}
    </div>
  );
};

export { Skeleton };
export default PageLoadingSkeleton;