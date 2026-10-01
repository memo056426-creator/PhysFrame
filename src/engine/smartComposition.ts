import { getLightingProfile, getSmartLightingSuggestions, type EngineTimeOfDay } from './lighting';
import {
  getAllowedAtmosphere,
  getAllowedCaptureTypes,
  getAllowedForegroundObstructions,
  getSceneCapability,
  getSubSceneCapability,
  type BackgroundDynamics,
  type GazeDirection,
  type HandProp,
  type SceneFamilyId
} from './capabilities';
import { resolveSceneConflicts, type RuleSceneState, type SceneFamilyConfig } from './rules';

export type LensCondition = 'modern-iphone' | 'budget-android' | 'smudged-lens';
export type ClothingCondition = 'crisp' | 'worn-all-day' | 'vintage-washed';
export type FacialHairState = 'clean-shaven' | '3-day-stubble' | 'full-beard-neat' | 'full-beard-unkempt';
export type FlashMode = 'no-flash' | 'direct-flash' | 'ambient-only';
export type FramingImperfection = 'perfect' | 'dutch-angle' | 'awkward-crop';

export interface SmartCompositionState extends RuleSceneState {
  environmentRealism: string;
  lensCondition: LensCondition;
  clothingCondition: ClothingCondition;
  gazeDirection: GazeDirection;
  facialHairState: FacialHairState;
  flashMode: FlashMode;
  backgroundDynamics: BackgroundDynamics;
  useDigitalZoom: boolean;
  framingImperfection: FramingImperfection;
  expression: string;
  realismStyle: string;
  groupSelfieEnabled?: boolean;
}

export type SceneFamilyMap = Record<SceneFamilyId, SceneFamilyConfig>;

const pick = <T>(items: readonly T[], rng: () => number): T => {
  if (!items.length) throw new Error('Cannot pick from an empty capability list');
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index];
};

const weightedCaptureTypes = (allowed: readonly SmartCompositionState['captureType'][]): SmartCompositionState['captureType'][] => {
  const weighted: SmartCompositionState['captureType'][] = [];
  if (allowed.includes('front-selfie')) weighted.push('front-selfie', 'front-selfie', 'front-selfie', 'front-selfie', 'front-selfie');
  if (allowed.includes('third-person-candid')) weighted.push('third-person-candid', 'third-person-candid', 'third-person-candid');
  if (allowed.includes('mirror-selfie')) weighted.push('mirror-selfie', 'mirror-selfie');
  return weighted.length ? weighted : ['front-selfie'];
};

const weightedBackground = (allowed: readonly BackgroundDynamics[]): BackgroundDynamics[] => {
  const weighted: BackgroundDynamics[] = [];
  if (allowed.includes('empty')) weighted.push('empty', 'empty');
  if (allowed.includes('casual')) weighted.push('casual', 'casual', 'casual');
  if (allowed.includes('busy')) weighted.push('busy');
  return weighted.length ? weighted : ['empty'];
};

const weightedTimes: readonly EngineTimeOfDay[] = [
  'morning', 'morning',
  'midday', 'midday',
  'afternoon', 'afternoon', 'afternoon',
  'sunset',
  'night', 'night', 'night'
];

export const buildSmartComposition = <T extends SmartCompositionState>(
  current: T,
  families: SceneFamilyMap,
  rng: () => number = Math.random
): T => {
  const familyIds = Object.keys(families) as SceneFamilyId[];
  const sceneFamily = pick(familyIds, rng);
  const family = families[sceneFamily];
  const capability = getSceneCapability(sceneFamily);

  const subScene = pick(family.subScenes, rng);
  const allowedCaptureTypes = getAllowedCaptureTypes(sceneFamily, subScene);
  const captureType = current.groupSelfieEnabled && allowedCaptureTypes.includes('front-selfie')
    ? 'front-selfie'
    : pick(weightedCaptureTypes(allowedCaptureTypes), rng);
  const activity = pick(family.activities, rng);
  const timeOfDay = pick(weightedTimes, rng);

  const lightingSuggestions = getSmartLightingSuggestions({
    sceneFamily,
    subScene,
    timeOfDay,
    activity
  }, 4);
  if (!lightingSuggestions.length) throw new Error('No compatible physical lighting suggestions for generated scene');
  const lightingMode = pick(lightingSuggestions.map(item => item.kind), rng);
  const lightingProfile = getLightingProfile(lightingMode);

  const atmosphericCondition = pick(getAllowedAtmosphere(sceneFamily, subScene), rng);
  const subSceneCapability = getSubSceneCapability(sceneFamily, subScene);
  let foregroundObstruction = pick(getAllowedForegroundObstructions(sceneFamily, subScene), rng);
  if (subSceneCapability?.forceThroughGlassForCandid && captureType === 'third-person-candid') {
    foregroundObstruction = 'through-glass';
  } else if (sceneFamily === 'car' && subScene === 'داخل السيارة' && captureType !== 'third-person-candid') {
    foregroundObstruction = 'clean';
  }

  const gazeDirection = pick(capability.gazeDirections, rng);
  const handProps: HandProp[] = [...capability.handProps];
  if (current.hasGlasses) handProps.push('adjusting-glasses');
  const handProp = pick(['none', 'none', ...handProps] as HandProp[], rng);

  const lensCondition = pick<LensCondition>([
    'modern-iphone', 'modern-iphone', 'modern-iphone', 'modern-iphone', 'modern-iphone', 'modern-iphone', 'modern-iphone',
    'budget-android', 'budget-android', 'smudged-lens'
  ], rng);
  const clothingCondition = pick<ClothingCondition>([
    'crisp', 'crisp', 'crisp', 'crisp', 'crisp', 'crisp', 'crisp',
    'worn-all-day', 'worn-all-day', 'vintage-washed'
  ], rng);
  const facialHairState = pick<FacialHairState>(['clean-shaven', '3-day-stubble', '3-day-stubble', 'full-beard-neat', 'full-beard-unkempt'], rng);
  const backgroundDynamics = pick(weightedBackground(capability.backgroundDynamics), rng);
  const framingImperfection = pick<FramingImperfection>(['perfect', 'perfect', 'perfect', 'dutch-angle', 'awkward-crop'], rng);

  const flashMode: FlashMode = lightingProfile.soleAmbientSource
    ? 'no-flash'
    : pick<FlashMode>(['no-flash', 'no-flash', 'no-flash', 'ambient-only', 'direct-flash'], rng);

  const generated: T = {
    ...current,
    sceneFamily,
    subScene,
    activity,
    pose: pick(family.poses, rng),
    lightingMode,
    timeOfDay,
    captureType,
    environmentRealism: pick(family.environmentRealism, rng),
    atmosphericCondition,
    foregroundObstruction,
    gazeDirection,
    handProp,
    lensCondition,
    clothingCondition,
    facialHairState,
    flashMode,
    backgroundDynamics,
    useDigitalZoom: captureType === 'third-person-candid' && rng() < 0.25,
    framingImperfection,
    expression: 'e1',
    realismStyle: 'anti-ai-raw'
  };

  // Smart Composition must be valid by construction. If the resolver changes anything,
  // the generator and capability/lighting metadata have drifted out of sync.
  const checked = resolveSceneConflicts(generated, family);
  if (JSON.stringify(checked) !== JSON.stringify(generated)) {
    throw new Error('Smart Composition produced a state that required conflict repair');
  }

  return generated;
};
