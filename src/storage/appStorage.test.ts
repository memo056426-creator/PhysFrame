import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../state/sceneState';
import type { SavedPreset } from '../types/scene';
import {
  clearCurrentSceneState,
  CURRENT_SCENE_STATE_KEY,
  loadCurrentSceneState,
  loadSavedPresets,
  SAVED_PRESETS_KEY,
  saveCurrentSceneState,
  saveSavedPresets,
  type KeyValueStorage
} from './appStorage';

class MemoryStorage implements KeyValueStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('appStorage', () => {
  it('loads and normalizes the persisted current scene state', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_SCENE_STATE_KEY, JSON.stringify({ backgroundDynamics: 'busy-motion' }));

    const state = loadCurrentSceneState(storage);
    expect(state?.backgroundDynamics).toBe('busy');
    expect(state?.captureType).toBe(DEFAULT_STATE.captureType);
  });

  it('saves and clears the current scene state', () => {
    const storage = new MemoryStorage();
    saveCurrentSceneState(storage, DEFAULT_STATE);

    expect(JSON.parse(storage.getItem(CURRENT_SCENE_STATE_KEY) ?? '{}').outfitId).toBe(DEFAULT_STATE.outfitId);
    clearCurrentSceneState(storage);
    expect(storage.getItem(CURRENT_SCENE_STATE_KEY)).toBeNull();
  });

  it('loads only preset-shaped entries and normalizes their state', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVED_PRESETS_KEY, JSON.stringify([
      { id: '1', name: 'قديم', state: { outfitId: 'missing-outfit', backgroundDynamics: 'empty-still' } },
      null,
      { id: '2', name: 'بدون حالة' }
    ]));

    const presets = loadSavedPresets(storage);
    expect(presets).toHaveLength(1);
    expect(presets[0].state.outfitId).toBe(DEFAULT_STATE.outfitId);
    expect(presets[0].state.backgroundDynamics).toBe('empty');
  });

  it('saves preset collections without changing their payload', () => {
    const storage = new MemoryStorage();
    const presets: SavedPreset[] = [{ id: '7', name: 'اختبار', state: DEFAULT_STATE }];

    saveSavedPresets(storage, presets);
    expect(JSON.parse(storage.getItem(SAVED_PRESETS_KEY) ?? '[]')).toEqual(presets);
  });

  it('preserves the existing malformed JSON failure behavior', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_SCENE_STATE_KEY, '{broken');
    expect(() => loadCurrentSceneState(storage)).toThrow();
  });
});
