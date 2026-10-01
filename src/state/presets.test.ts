import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './sceneState';
import { addSavedPreset, buildPresetName, createSavedPreset, removeSavedPreset } from './presets';

const bedroomState = {
  ...DEFAULT_STATE,
  sceneFamily: 'bedroom' as const
};

describe('presets', () => {
  it('does not create a preset before a scene family is selected', () => {
    expect(buildPresetName(DEFAULT_STATE)).toBeNull();
    expect(createSavedPreset(DEFAULT_STATE, () => '1')).toBeNull();

    const presets: never[] = [];
    expect(addSavedPreset(presets, DEFAULT_STATE, () => '1')).toBe(presets);
  });

  it('builds the same Arabic daytime name used by the UI', () => {
    expect(buildPresetName({ ...bedroomState, timeOfDay: 'sunset' })).toBe('غرفة نوم - نهار');
  });

  it('uses the night label only for night scenes', () => {
    expect(buildPresetName({ ...bedroomState, timeOfDay: 'night' })).toBe('غرفة نوم - ليل');
  });

  it('creates and appends a preset with a deterministic id factory', () => {
    const state = { ...bedroomState, timeOfDay: 'night' as const };
    const preset = createSavedPreset(state, () => '42');

    expect(preset).toEqual({
      id: '42',
      name: 'غرفة نوم - ليل',
      state
    });

    expect(addSavedPreset([], state, () => '42')).toEqual([preset]);
  });

  it('removes only the matching preset id', () => {
    const first = createSavedPreset(bedroomState, () => '1');
    const second = createSavedPreset({ ...bedroomState, timeOfDay: 'night' }, () => '2');
    if (!first || !second) throw new Error('Expected presets to be created');

    expect(removeSavedPreset([first, second], '1')).toEqual([second]);
    expect(removeSavedPreset([first, second], 'missing')).toEqual([first, second]);
  });
});
