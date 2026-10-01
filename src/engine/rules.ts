import type { SubSceneId } from '../data/subScenes';
import type { ActivityId } from '../data/activities';
import {
  getSceneLightingKinds,
  resolveLightingCompatibility,
  type EngineTimeOfDay,
  type LightingKind
} from './lighting';
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
  subScenes: readonly SubSceneId[];
  activities: readonly ActivityId[];
  poses: readonly string[];
  allowedLighting: readonly LightingKind[];
  environmentRealism: readonly string[];
}

export interface RuleSceneState {
  sceneFamily: SceneFamilyId | null;
  subScene: SubSceneId | '';
  activity: ActivityId | '';
  pose: string;
  lightingMode: LightingKind;
  timeOfDay: EngineTimeOfDay;
  captureType: CaptureType;
  atmosphericCondition: AtmosphericCondition;
  foregroundObstruction: ForegroundObstruction;
  hasGlasses: boolean;
  handProp: HandProp;
  outfitId: string;
  hairStyle: string;
  groupSelfieEnabled?: boolean;
}

const firstOr = <T>(items: readonly T[], fallback: T): T => items[0] ?? fallback;

export const resolveSceneConflicts = <T extends RuleSceneState>(
  state: T,
  family: SceneFamilyConfig | undefined
): T => {
  const next = { ...state } as T;

  // Group-selfie architecture is only physically valid for a hand-held front camera capture.
  // Manual capture selection wins: switching away from front-selfie disables group mode rather than rewriting captureType.
  if (next.groupSelfieEnabled && next.captureType !== 'front-selfie') {
    next.groupSelfieEnabled = false;
  }

  if (!next.sceneFamily || !family) return next;

  if (!next.subScene || !family.subScenes.includes(next.subScene)) next.subScene = firstOr(family.subScenes, '');
  if (!next.activity || !family.activities.includes(next.activity)) next.activity = firstOr(family.activities, '');
  if (!family.poses.includes(next.pose)) next.pose = firstOr(family.poses, '');

  const environmentRealism = (next as T & { environmentRealism?: string }).environmentRealism;
  if (typeof environmentRealism === 'string' && !family.environmentRealism.includes(environmentRealism)) {
    (next as T & { environmentRealism: string }).environmentRealism = firstOr(family.environmentRealism, '');
  }

  // Lighting validity is derived from scene semantics instead of a hand-maintained family list.
  // Keep the legacy list only as a defensive fallback for future incomplete scene metadata.
  const sceneAwareLighting = getSceneLightingKinds(next.sceneFamily, next.subScene);
  const allowedLighting = sceneAwareLighting.length ? sceneAwareLighting : family.allowedLighting;
  const lightingResolution = resolveLightingCompatibility({
    lightingMode: next.lightingMode,
    allowedLighting,
    timeOfDay: next.timeOfDay
  });
  next.lightingMode = lightingResolution.lightingMode;
  next.timeOfDay = lightingResolution.timeOfDay;

  const allowedCaptureTypes = getAllowedCaptureTypes(next.sceneFamily, next.subScene);
  if (!allowedCaptureTypes.includes(next.captureType)) {
    next.captureType = firstOr(allowedCaptureTypes, 'front-selfie');
  }

  if (next.groupSelfieEnabled && next.captureType !== 'front-selfie') {
    next.groupSelfieEnabled = false;
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
