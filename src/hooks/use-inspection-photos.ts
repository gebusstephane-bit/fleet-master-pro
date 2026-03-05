'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';

export interface PhotoUpload {
  file: File;
  preview: string;
  url?: string;
  isUploading: boolean;
  error?: string;
}

interface UseInspectionPhotosOptions {
  inspectionId?: string;
  maxPhotos?: number;
  maxSizeMB?: number;
}

export function useInspectionPhotos(options: UseInspectionPhotosOptions = {}) {
  const { inspectionId, maxPhotos = 4, maxSizeMB = 2 } = options;
  const { user } = useUserContext();
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const supabase = createClient();

  /**
   * Valide un fichier avant upload
   */
  const validateFile = useCallback((file: File): string | null => {
    // Vérifier le type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Format non supporté. Utilisez JPG, PNG ou WebP.';
    }

    // Vérifier la taille
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `Fichier trop lourd. Maximum ${maxSizeMB}Mo.`;
    }

    // Vérifier le nombre max
    if (photos.length >= maxPhotos) {
      return `Maximum ${maxPhotos} photos autorisées.`;
    }

    return null;
  }, [photos.length, maxPhotos, maxSizeMB]);

  /**
   * Compresse une image avant upload
   */
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(file); // Fallback: pas de compression
            return;
          }

          // Redimensionner si trop grande (max 1920px)
          let width = img.width;
          let height = img.height;
          const maxDim = 1920;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height / width) * maxDim;
              width = maxDim;
            } else {
              width = (width / height) * maxDim;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir en blob avec compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.85 // Qualité 85%
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  }, []);

  /**
   * Ajoute des photos (sélection fichier)
   */
  const addPhotos = useCallback(async (files: FileList | null): Promise<string[]> => {
    if (!files || !user?.company_id) return [];

    const newPhotos: PhotoUpload[] = [];
    const uploadedUrls: string[] = [];

    // Valider tous les fichiers d'abord
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      if (error) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
          error,
          isUploading: false,
        });
        continue;
      }

      // Vérifier qu'on ne dépasse pas le max
      if (photos.length + newPhotos.length >= maxPhotos) {
        break;
      }

      newPhotos.push({
        file,
        preview: URL.createObjectURL(file),
        isUploading: true,
      });
    }

    if (newPhotos.length === 0) return [];

    setPhotos(prev => [...prev, ...newPhotos]);
    setIsUploading(true);

    // Uploader chaque fichier
    for (let i = 0; i < newPhotos.length; i++) {
      const photo = newPhotos[i];
      if (photo.error) continue;

      try {
        // Compresser l'image
        const compressedFile = await compressImage(photo.file);
        
        // Générer un nom unique
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileName = `${user.company_id}/${inspectionId || 'temp'}/${timestamp}_${random}.jpg`;

        // Upload vers Supabase Storage
        const { data, error } = await supabase.storage
          .from('inspections')
          .upload(fileName, compressedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        // Récupérer l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('inspections')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);

        // Mettre à jour le state
        setPhotos(prev => {
          const updated = [...prev];
          const index = prev.findIndex(p => p.preview === photo.preview);
          if (index !== -1) {
            updated[index] = { ...updated[index], url: publicUrl, isUploading: false };
          }
          return updated;
        });

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur upload';
        setPhotos(prev => {
          const updated = [...prev];
          const index = prev.findIndex(p => p.preview === photo.preview);
          if (index !== -1) {
            updated[index] = { ...updated[index], error: message, isUploading: false };
          }
          return updated;
        });
      }
    }

    setIsUploading(false);
    return uploadedUrls;
  }, [user, inspectionId, maxPhotos, validateFile, compressImage, supabase, photos.length]);

  /**
   * Supprime une photo
   */
  const removePhoto = useCallback(async (index: number): Promise<void> => {
    const photo = photos[index];
    if (!photo) return;

    // Si l'photo a une URL (déjà uploadée), supprimer du storage
    if (photo.url) {
      try {
        // Extraire le chemin de l'URL
        const url = new URL(photo.url);
        const pathMatch = url.pathname.match(/\/inspections\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from('inspections').remove([pathMatch[1]]);
        }
      } catch {
        // Ignorer les erreurs de suppression
      }
    }

    // Révoquer l'URL de preview pour libérer la mémoire
    if (photo.preview && !photo.url) {
      URL.revokeObjectURL(photo.preview);
    }

    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, [photos, supabase]);

  /**
   * Réordonner les photos
   */
  const reorderPhotos = useCallback((fromIndex: number, toIndex: number): void => {
    setPhotos(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  /**
   * Réinitialiser toutes les photos
   */
  const resetPhotos = useCallback((): void => {
    // Nettoyer les URLs de preview
    photos.forEach(p => {
      if (p.preview && !p.url) {
        URL.revokeObjectURL(p.preview);
      }
    });
    setPhotos([]);
  }, [photos]);

  /**
   * Récupérer les URLs des photos uploadées
   */
  const getUploadedUrls = useCallback((): string[] => {
    return photos
      .filter(p => p.url && !p.error)
      .map(p => p.url!);
  }, [photos]);

  return {
    photos,
    isUploading,
    canAddMore: photos.length < maxPhotos,
    remainingSlots: maxPhotos - photos.length,
    addPhotos,
    removePhoto,
    reorderPhotos,
    resetPhotos,
    getUploadedUrls,
  };
}
