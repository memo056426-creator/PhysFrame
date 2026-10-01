from pathlib import Path

app_path = Path('src/App.tsx')
text = app_path.read_text()
start_marker = '// --- REALISM DERIVATION ---'
end_marker = 'const buildSemanticScene = '
import_anchor = "import { resolveBackgroundDynamics } from './engine/backgroundDynamics';\n"
new_import = "import { deriveRealismState } from './engine/realismState';\n"

assert start_marker in text, 'realism derivation marker missing'
assert end_marker in text, 'buildSemanticScene marker missing'
assert text.count(start_marker) == 1, 'unexpected duplicate realism marker'
assert text.count(end_marker) == 1, 'unexpected duplicate semantic builder marker'
assert import_anchor in text, 'background dynamics import anchor missing'
assert new_import not in text, 'realismState import already present'

start = text.index(start_marker)
end = text.index(end_marker)
assert start < end, 'realism markers out of order'

block = text[start:end]
assert 'const deriveRealismState' in block, 'deriveRealismState missing from block'
engine_block = block.replace('const deriveRealismState', 'export const deriveRealismState', 1).lstrip()
engine_imports = """import { FACIAL_HAIR_STATES, HAND_PROPS } from '../data/sceneOptions';
import type { DerivedSceneState, SceneState } from '../types/scene';
import { buildGroupSelfieProfile } from './groupSelfie';
import { getLightingProfile } from './lighting';
import { buildPhysicalProfile } from './physics';

"""
Path('src/engine/realismState.ts').write_text(engine_imports + engine_block)

text = text[:start] + text[end:]
text = text.replace(import_anchor, import_anchor + new_import, 1)
app_path.write_text(text)

test = r'''import { describe, expect, it } from 'vitest';
import { deriveRealismState } from './realismState';
import type { SceneState } from '../types/scene';

const makeState = (overrides: Partial<SceneState> = {}): SceneState => ({
  referenceImageId: null,
  hasGlasses: false,
  sceneFamily: 'bedroom',
  subScene: 'بجانب السرير',
  activity: 'واقف بشكل طبيعي',
  captureType: 'front-selfie',
  framing: 'chest-up',
  cameraAngle: 'eye-level',
  framingImperfection: 'perfect',
  useDigitalZoom: false,
  pose: 'واقف بثبات',
  outfitId: 'cas1',
  hairStyle: 'h1',
  expression: 'e1',
  timeOfDay: 'midday',
  lightingMode: 'ضوء نهاري طبيعي',
  environmentRealism: 'طبيعية',
  realismStyle: 'raw-candid',
  lensCondition: 'modern-iphone',
  clothingCondition: 'crisp',
  atmosphericCondition: 'neutral',
  foregroundObstruction: 'clean',
  gazeDirection: 'at-camera',
  handProp: 'none',
  facialHairState: '3-day-stubble',
  flashMode: 'no-flash',
  backgroundDynamics: 'empty',
  groupSelfieEnabled: false,
  groupSelfieCompanionCount: 1,
  ...overrides
});

describe('deriveRealismState', () => {
  it('preserves front-selfie camera distance and lens behavior', () => {
    const result = deriveRealismState(makeState({ captureType: 'front-selfie', framing: 'chest-up' }));
    expect(result.cameraDistance).toBe('extended arm-reach (approx 65cm)');
    expect(result.lensEffects).toContain('smartphone front-camera aesthetic');
  });

  it('adds physically constrained mirror reflection rules', () => {
    const result = deriveRealismState(makeState({ captureType: 'mirror-selfie' }));
    expect(result.reflectionRules.join(' ')).toContain('geometrically accurate mirror reflection');
    expect(result.lensEffects).toContain('capturing a reflection');
  });

  it('layers direct flash onto ambient lighting instead of replacing it', () => {
    const result = deriveRealismState(makeState({ flashMode: 'direct-flash' }));
    expect(result.flashEffects).toContain('supplements the selected ambient source');
    expect(result.shadowBehavior).toContain('flash-cast shadow');
    expect(result.skinResponse).toContain('flash specular highlights');
  });

  it('preserves hand-prop and facial-hair prompt details', () => {
    const result = deriveRealismState(makeState({ handProp: 'car-keys', facialHairState: '3-day-stubble' }));
    expect(result.handPropDetails).toContain('car keys');
    expect(result.facialHairDetails).toContain('3-day stubble');
  });

  it('keeps digital zoom degradation limited to third-person captures', () => {
    const result = deriveRealismState(makeState({ captureType: 'third-person-candid', useDigitalZoom: true }));
    expect(result.lensEffects).toContain('digital zoom artifacts');
    expect(result.realismConstraints).toContain('digital zoom must reduce fine-detail fidelity rather than creating artificial optical bokeh');
  });
});
'''
Path('src/engine/realismState.test.ts').write_text(test)
