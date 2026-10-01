import { normalizeSceneState } from '../state/sceneState';
import type { SavedPreset, SceneState } from '../types/scene';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const CURRENT_SCENE_STATE_KEY = 'physframe_current_state';
export const SAVED_PRESETS_KEY = 'physframe_presets';

export const loadCurrentSceneState = (storage: KeyValueStorage): SceneState | null => {
  const savedState = storage.getItem(CURRENT_SCENE_STATE_KEY);
  return savedState ? normalizeSceneState(JSON.parse(savedState)) : null;
};

export const saveCurrentSceneState = (storage: KeyValueStorage, state: SceneState): void => {
  storage.setItem(CURRENT_SCENE_STATE_KEY, JSON.stringify(state));
};

export const clearCurrentSceneState = (storage: KeyValueStorage): void => {
  storage.removeItem(CURRENT_SCENE_STATE_KEY);
};

const isSavedPreset = (preset: unknown): preset is SavedPreset =>
  Boolean(preset && typeof preset === 'object' && 'state' in preset);

export const loadSavedPresets = (storage: KeyValueStorage): SavedPreset[] => {
  const savedPresets = storage.getItem(SAVED_PRESETS_KEY);
  if (!savedPresets) return [];

  const parsedPresets: unknown = JSON.parse(savedPresets);
  if (!Array.isArray(parsedPresets)) return [];

  return parsedPresets
    .filter(isSavedPreset)
    .map(preset => ({ ...preset, state: normalizeSceneState(preset.state) }));
};

export const saveSavedPresets = (storage: KeyValueStorage, presets: SavedPreset[]): void => {
  storage.setItem(SAVED_PRESETS_KEY, JSON.stringify(presets));
};
