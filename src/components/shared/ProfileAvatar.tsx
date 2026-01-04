import React from 'react';
import { User } from 'lucide-react';
import { useLocalProfilePhoto } from '@/hooks/useLocalProfilePhoto';

interface ProfileAvatarProps {
  profileId: string | undefined;
  fallbackName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
};

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profileId,
  fallbackName,
  size = 'sm',
  className = '',
}) => {
  const { photoUrl, loading } = useLocalProfilePhoto(profileId);

  const initial = fallbackName?.charAt(0).toUpperCase() || '';

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={fallbackName || 'Avatar'}
          className="w-full h-full object-cover"
        />
      ) : initial ? (
        <span className="font-bebas text-primary">{initial}</span>
      ) : (
        <User className="text-primary/50" size={size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'md' ? 18 : 24} />
      )}
    </div>
  );
};

export default ProfileAvatar;
