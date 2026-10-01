import { useCallback, useState } from 'react';
import { loadSavedPresets, saveSavedPresets } from '../storage/appStorage';
import { addSavedPreset, removeSavedPreset } from '../state/presets';
import type { SavedPreset, SceneState } from '../types/scene';

export function usePresets(state: SceneState) {
  const [presets, setPresets] = useState<SavedPreset[]>([]);

  const hydratePresets = useCallback(() => {
    const savedPresets = loadSavedPresets(localStorage);
    setPresets(savedPresets);
    return savedPresets;
  }, []);

  const handleSavePreset = useCallback(() => {
    setPresets(current => {
      const updatedPresets = addSavedPreset(current, state);
      if (updatedPresets === current) return current;

      saveSavedPresets(localStorage, updatedPresets);
      return updatedPresets;
    });
  }, [state]);

  const deletePreset = useCallback((id: string) => {
    setPresets(current => {
      const updatedPresets = removeSavedPreset(current, id);
      saveSavedPresets(localStorage, updatedPresets);
      return updatedPresets;
    });
  }, []);

  return {
    presets,
    hydratePresets,
    handleSavePreset,
    deletePreset
  };
}
