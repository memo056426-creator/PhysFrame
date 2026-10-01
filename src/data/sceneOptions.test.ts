import { describe, expect, it } from 'vitest';
import { VIBE_PRESETS } from './sceneOptions';

describe('vibe presets', () => {
  it('never overrides the user-selected camera capture mode', () => {
    for (const preset of VIBE_PRESETS) {
      expect('captureType' in preset.state).toBe(false);
    }
  });
});
