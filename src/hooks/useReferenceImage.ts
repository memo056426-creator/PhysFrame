import { useCallback, useEffect, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { sanitizeReferenceImage } from '../engine/referenceImage';
import { deleteImageFromDB, loadImageFromDB, saveImageToDB } from '../storage/referenceImageStorage';
import type { SceneState } from '../types/scene';

export function useReferenceImage(
  setState: Dispatch<SetStateAction<SceneState>>
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasReference, setHasReference] = useState(false);

  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const hydrateReferenceImage = useCallback(async () => {
    const blob = await loadImageFromDB();
    if (!blob) return;

    try {
      const safeBlob = await sanitizeReferenceImage(blob);
      await saveImageToDB(safeBlob);
      setImageUrl(URL.createObjectURL(safeBlob));
      setHasReference(true);
    } catch (error) {
      console.warn('Discarded an unsafe or unsupported stored reference image.', error);
      await deleteImageFromDB();
    }
  }, []);

  const handleImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      let safeImage: Blob;
      try {
        safeImage = await sanitizeReferenceImage(file);
      } catch (error) {
        console.warn('Rejected unsafe or unsupported reference image.', error);
        event.currentTarget.value = '';
        return;
      }

      try {
        await saveImageToDB(safeImage);
      } catch (error) {
        console.warn(
          'Could not persist reference image in IndexedDB; using session preview only.',
          error
        );
      }

      setImageUrl(current => {
        if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
        return URL.createObjectURL(safeImage);
      });
      setHasReference(true);
      setState(current => ({ ...current, referenceImageId: file.name }));
    },
    [setState]
  );

  const handleImageDelete = useCallback(async () => {
    try {
      await deleteImageFromDB();
    } catch (error) {
      console.warn('Could not remove reference image from IndexedDB.', error);
    }

    setImageUrl(current => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return null;
    });
    setHasReference(false);
    setState(current => ({ ...current, referenceImageId: null }));
  }, [setState]);

  return {
    imageUrl,
    hasReference,
    hydrateReferenceImage,
    handleImageUpload,
    handleImageDelete
  };
}
