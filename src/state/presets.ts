import { SCENE_FAMILIES } from '../data/sceneOptions';
import type { SavedPreset, SceneState } from '../types/scene';

export type PresetIdFactory = () => string;

const defaultPresetIdFactory: PresetIdFactory = () => Date.now().toString();

export const buildPresetName = (state: SceneState): string | null => {
  if (!state.sceneFamily) return null;
  const periodLabel = state.timeOfDay === 'night' ? 'ليل' : 'نهار';
  return `${SCENE_FAMILIES[state.sceneFamily].labelAR} - ${periodLabel}`;
};

export const createSavedPreset = (
  state: SceneState,
  idFactory: PresetIdFactory = defaultPresetIdFactory
): SavedPreset | null => {
  const name = buildPresetName(state);
  if (!name) return null;

  return {
    id: idFactory(),
    name,
    state
  };
};

export const addSavedPreset = (
  presets: SavedPreset[],
  state: SceneState,
  idFactory?: PresetIdFactory
): SavedPreset[] => {
  const preset = createSavedPreset(state, idFactory);
  return preset ? [...presets, preset] : presets;
};

export const removeSavedPreset = (presets: SavedPreset[], id: string): SavedPreset[] =>
  presets.filter(preset => preset.id !== id);
