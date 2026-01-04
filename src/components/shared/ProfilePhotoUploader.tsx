import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Trash2, Loader2, User } from 'lucide-react';
import { useLocalProfilePhoto } from '@/hooks/useLocalProfilePhoto';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProfilePhotoUploaderProps {
  profileId: string | undefined;
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

const iconSizes = {
  sm: 16,
  md: 24,
  lg: 32,
};

const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  profileId,
  size = 'md',
  showActions = true,
  className = '',
}) => {
  const { photoUrl, loading, error, savePhoto, deletePhoto } = useLocalProfilePhoto(profileId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const success = await savePhoto(file);
    if (success) {
      toast.success('Foto atualizada com sucesso!');
    } else if (error) {
      toast.error(error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    const success = await deletePhoto();
    if (success) {
      toast.success('Foto removida!');
    }
  };

  const handleClick = () => {
    if (showActions) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div
        whileHover={showActions ? { scale: 1.05 } : {}}
        whileTap={showActions ? { scale: 0.95 } : {}}
        onClick={handleClick}
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 cursor-pointer group`}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="animate-spin text-primary" size={iconSizes[size]} />
          </div>
        ) : photoUrl ? (
          <>
            <img
              src={photoUrl}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
            {showActions && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={iconSizes[size]} />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="text-primary/50" size={iconSizes[size]} />
            {showActions && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={iconSizes[size]} />
              </div>
            )}
          </div>
        )}
      </motion.div>

      {showActions && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="text-xs"
          >
            <Camera size={14} className="mr-1" />
            {photoUrl ? 'Trocar' : 'Adicionar'}
          </Button>
          
          {photoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="text-xs text-destructive hover:text-destructive"
            >
              <Trash2 size={14} className="mr-1" />
              Remover
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-[10px] text-muted-foreground text-center">
        Foto salva localmente neste dispositivo
      </p>
    </div>
  );
};

export default ProfilePhotoUploader;
