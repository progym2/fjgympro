import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Dashboard Menu Item Skeleton
export const MenuItemSkeleton: React.FC = () => (
  <Card className="bg-card/50 border-border/30">
    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col items-center gap-2 sm:gap-3">
      <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl" />
      <Skeleton className="h-4 w-20" />
    </CardContent>
  </Card>
);

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC = () => (
  <Card className="bg-card/50 border-border/30">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Workout Plan Skeleton
export const WorkoutPlanSkeleton: React.FC = () => (
  <Card className="bg-card/50 border-border/30 overflow-hidden">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex gap-2 mb-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </CardContent>
  </Card>
);

// Exercise Card Skeleton
export const ExerciseCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-xl bg-background/50 border border-border/30 space-y-3">
    <div className="flex items-start gap-3">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="flex gap-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-8 flex-1 rounded-lg" />
      ))}
    </div>
  </div>
);

// Chart Skeleton
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <Card className="bg-card/50 border-border/30">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-end gap-2" style={{ height }}>
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="flex-1"
          >
            <Skeleton className="w-full h-full rounded-t-md" />
          </motion.div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <Skeleton key={d} className="h-3 w-6" />
        ))}
      </div>
    </CardContent>
  </Card>
);

// Profile Card Skeleton
export const ProfileCardSkeleton: React.FC = () => (
  <Card className="bg-card/50 border-border/30">
    <CardContent className="p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
    <Skeleton className="w-10 h-10 rounded-lg" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="w-8 h-8 rounded-lg" />
  </div>
);

// Notification Skeleton
export const NotificationSkeleton: React.FC = () => (
  <div className="p-4 rounded-xl bg-background/50 border border-border/30">
    <div className="flex gap-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  </div>
);

// Hydration Card Skeleton
export const HydrationCardSkeleton: React.FC = () => (
  <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-full rounded-full" />
      <div className="flex justify-between mt-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardContent>
  </Card>
);

// Achievement Skeleton
export const AchievementSkeleton: React.FC = () => (
  <Card className="bg-card/50 border-border/30">
    <CardContent className="p-4 text-center">
      <Skeleton className="w-12 h-12 rounded-full mx-auto mb-3" />
      <Skeleton className="h-4 w-24 mx-auto mb-1" />
      <Skeleton className="h-3 w-32 mx-auto mb-3" />
      <Skeleton className="h-2 w-full rounded-full mb-1" />
      <Skeleton className="h-3 w-12 mx-auto" />
    </CardContent>
  </Card>
);

// Page Loading Skeleton
export const PageLoadingSkeleton: React.FC<{ type?: 'dashboard' | 'list' | 'detail' }> = ({ type = 'dashboard' }) => {
  if (type === 'dashboard') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <MenuItemSkeleton />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <ListItemSkeleton />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProfileCardSkeleton />
      <div className="grid grid-cols-2 gap-3">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <ChartSkeleton />
    </div>
  );
};

export default PageLoadingSkeleton;
