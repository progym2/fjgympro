import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'francgym_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'profile_photos';

interface ProfilePhoto {
  id: string;
  blob: Blob;
  mimeType: string;
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function savePhotoToIndexedDB(profileId: string, blob: Blob, mimeType: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const photo: ProfilePhoto = {
      id: profileId,
      blob,
      mimeType,
      updatedAt: Date.now(),
    };
    
    const request = store.put(photo);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    
    transaction.oncomplete = () => db.close();
  });
}

async function getPhotoFromIndexedDB(profileId: string): Promise<ProfilePhoto | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(profileId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
    
    transaction.oncomplete = () => db.close();
  });
}

async function deletePhotoFromIndexedDB(profileId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(profileId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    
    transaction.oncomplete = () => db.close();
  });
}

export function useLocalProfilePhoto(profileId: string | undefined) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load photo from IndexedDB
  const loadPhoto = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const photo = await getPhotoFromIndexedDB(profileId);
      
      if (photo) {
        const url = URL.createObjectURL(photo.blob);
        setPhotoUrl(url);
      } else {
        setPhotoUrl(null);
      }
    } catch (err) {
      console.error('Error loading profile photo:', err);
      setError('Erro ao carregar foto');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  // Load on mount and when profileId changes
  useEffect(() => {
    loadPhoto();
    
    // Cleanup URL on unmount
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [profileId]);

  // Save photo
  const savePhoto = useCallback(async (file: File): Promise<boolean> => {
    if (!profileId) return false;

    try {
      setLoading(true);
      setError(null);

      // Validate file
      if (!file.type.startsWith('image/')) {
        setError('Arquivo deve ser uma imagem');
        return false;
      }

      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        setError('Imagem deve ter no máximo 5MB');
        return false;
      }

      // Resize image to reduce storage
      const resizedBlob = await resizeImage(file, 300, 300);
      
      await savePhotoToIndexedDB(profileId, resizedBlob, file.type);
      
      // Update displayed photo
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
      const newUrl = URL.createObjectURL(resizedBlob);
      setPhotoUrl(newUrl);
      
      return true;
    } catch (err) {
      console.error('Error saving profile photo:', err);
      setError('Erro ao salvar foto');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, photoUrl]);

  // Delete photo
  const deletePhoto = useCallback(async (): Promise<boolean> => {
    if (!profileId) return false;

    try {
      setLoading(true);
      await deletePhotoFromIndexedDB(profileId);
      
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
      setPhotoUrl(null);
      
      return true;
    } catch (err) {
      console.error('Error deleting profile photo:', err);
      setError('Erro ao remover foto');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, photoUrl]);

  return {
    photoUrl,
    loading,
    error,
    savePhoto,
    deletePhoto,
    refreshPhoto: loadPhoto,
  };
}

// Utility to resize image
async function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.85
      );
      
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
    
    img.src = URL.createObjectURL(file);
  });
}
