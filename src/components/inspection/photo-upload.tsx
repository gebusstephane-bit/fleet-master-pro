'use client';

import { useRef, useCallback } from 'react';
import { Camera, X, GripVertical, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useInspectionPhotos, PhotoUpload } from '@/hooks/use-inspection-photos';

interface PhotoUploadSectionProps {
  inspectionId?: string;
  onPhotosChange?: (urls: string[]) => void;
  maxPhotos?: number;
  className?: string;
}

export function PhotoUploadSection({
  inspectionId,
  onPhotosChange,
  maxPhotos = 4,
  className,
}: PhotoUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    photos,
    isUploading,
    canAddMore,
    remainingSlots,
    addPhotos,
    removePhoto,
    getUploadedUrls,
  } = useInspectionPhotos({ inspectionId, maxPhotos });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await addPhotos(e.target.files);
    if (onPhotosChange) {
      onPhotosChange([...getUploadedUrls(), ...urls]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addPhotos, getUploadedUrls, onPhotosChange]);

  const handleRemove = useCallback(async (index: number) => {
    await removePhoto(index);
    if (onPhotosChange) {
      onPhotosChange(getUploadedUrls());
    }
  }, [removePhoto, getUploadedUrls, onPhotosChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-medium text-white">Photos du véhicule</h3>
          <span className="text-xs text-slate-500">
            ({photos.length}/{maxPhotos})
          </span>
        </div>
        {isUploading && (
          <span className="text-xs text-blue-400 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Upload en cours...
          </span>
        )}
      </div>

      {/* Grille de photos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Photos existantes */}
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.preview}
            photo={photo}
            index={index}
            onRemove={handleRemove}
          />
        ))}

        {/* Bouton d'ajout */}
        {canAddMore && (
          <Card
            className="aspect-square border-dashed border-2 border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center transition-colors">
              <Upload className="h-5 w-5 text-slate-400 group-hover:text-slate-300" />
            </div>
            <span className="text-xs text-slate-500 group-hover:text-slate-400 text-center px-2">
              Ajouter
              <br />
              {remainingSlots} restante{remainingSlots > 1 ? 's' : ''}
            </span>
          </Card>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Aide */}
      <p className="text-xs text-slate-500">
        Formats acceptés : JPG, PNG, WebP. Max 2Mo par photo.
      </p>
    </div>
  );
}

/**
 * Composant miniature d'une photo
 */
interface PhotoThumbnailProps {
  photo: PhotoUpload;
  index: number;
  onRemove: (index: number) => void;
}

function PhotoThumbnail({ photo, index, onRemove }: PhotoThumbnailProps) {
  return (
    <Card className="relative aspect-square overflow-hidden group bg-slate-800 border-slate-700">
      {/* Image */}
      <img
        src={photo.preview}
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Overlay de chargement */}
      {photo.isUploading && (
        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-300">Envoi...</span>
        </div>
      )}

      {/* Overlay d'erreur */}
      {photo.error && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center p-2 text-center">
          <span className="text-xs text-red-200">{photo.error}</span>
        </div>
      )}

      {/* Bouton de suppression */}
      {!photo.isUploading && (
        <button
          onClick={() => onRemove(index)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Indicateur de position */}
      <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full bg-slate-900/60 text-white text-xs flex items-center justify-center font-medium">
        {index + 1}
      </div>
    </Card>
  );
}
