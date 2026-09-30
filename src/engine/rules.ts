import { resolveLightingCompatibility, type EngineTimeOfDay } from './lighting';
import {
  getAllowedAtmosphere,
  getAllowedCaptureTypes,
  getAllowedForegroundObstructions,
  getSubSceneCapability,
  type AtmosphericCondition,
  type CaptureType,
  type ForegroundObstruction,
  type HandProp,
  type SceneFamilyId
} from './capabilities';

export interface SceneFamilyConfig {
  subScenes: readonly string[];
  activities: readonly string[];
  poses: readonly string[];
  allowedLighting: readonly string[];
  environmentRealism: readonly string[];
}

export interface RuleSceneState {
  sceneFamily: SceneFamilyId | null;
  subScene: string;
  activity: string;
  pose: string;
  lightingMode: string;
  timeOfDay: EngineTimeOfDay;
  captureType: CaptureType;
  atmosphericCondition: AtmosphericCondition;
  foregroundObstruction: ForegroundObstruction;
  hasGlasses: boolean;
  handProp: HandProp;
  outfitId: string;
  hairStyle: string;
}

const firstOr = <T>(items: readonly T[], fallback: T): T => items[0] ?? fallback;

export const resolveSceneConflicts = <T extends RuleSceneState>(
  state: T,
  family: SceneFamilyConfig | undefined
): T => {
  const next = { ...state } as T;
  if (!next.sceneFamily || !family) return next;

  if (!family.subScenes.includes(next.subScene)) next.subScene = firstOr(family.subScenes, '');
  if (!family.activities.includes(next.activity)) next.activity = firstOr(family.activities, '');
  if (!family.poses.includes(next.pose)) next.pose = firstOr(family.poses, '');

  const environmentRealism = (next as T & { environmentRealism?: string }).environmentRealism;
  if (typeof environmentRealism === 'string' && !family.environmentRealism.includes(environmentRealism)) {
    (next as T & { environmentRealism: string }).environmentRealism = firstOr(family.environmentRealism, '');
  }

  const lightingResolution = resolveLightingCompatibility({
    lightingMode: next.lightingMode,
    allowedLighting: family.allowedLighting,
    timeOfDay: next.timeOfDay
  });
  next.lightingMode = lightingResolution.lightingMode;
  next.timeOfDay = lightingResolution.timeOfDay;

  const allowedCaptureTypes = getAllowedCaptureTypes(next.sceneFamily, next.subScene);
  if (!allowedCaptureTypes.includes(next.captureType)) {
    next.captureType = firstOr(allowedCaptureTypes, 'front-selfie');
  }

  const allowedAtmosphere = getAllowedAtmosphere(next.sceneFamily, next.subScene);
  if (!allowedAtmosphere.includes(next.atmosphericCondition)) {
    next.atmosphericCondition = firstOr(allowedAtmosphere, 'neutral');
  }

  const allowedObstructions = getAllowedForegroundObstructions(next.sceneFamily, next.subScene);
  if (!allowedObstructions.includes(next.foregroundObstruction)) {
    next.foregroundObstruction = firstOr(allowedObstructions, 'clean');
  }

  const subSceneCapability = getSubSceneCapability(next.sceneFamily, next.subScene);
  if (subSceneCapability?.forceThroughGlassForCandid && next.captureType === 'third-person-candid') {
    next.foregroundObstruction = 'through-glass';
  }

  if (!next.hasGlasses && next.handProp === 'adjusting-glasses') next.handProp = 'none';

  // Hard manual invariants. These fields are deliberately never assigned above.
  // The assertions also make accidental future mutations visible during tests/review.
  if (next.outfitId !== state.outfitId) throw new Error('Rules invariant violated: outfitId must remain manual');
  if (next.hairStyle !== state.hairStyle) throw new Error('Rules invariant violated: hairStyle must remain manual');

  return next;
};

export const isConflictResolutionIdempotent = <T extends RuleSceneState>(
  state: T,
  family: SceneFamilyConfig | undefined
): boolean => {
  const once = resolveSceneConflicts(state, family);
  const twice = resolveSceneConflicts(once, family);
  return JSON.stringify(once) === JSON.stringify(twice);
};
