import type { SubSceneId } from '../data/subScenes';

export type SceneFamilyId = 'bedroom' | 'living-room' | 'saudi-outdoor' | 'gym' | 'car' | 'military-base';
export type CaptureType = 'front-selfie' | 'mirror-selfie' | 'third-person-candid';
export type AtmosphericCondition = 'neutral' | 'high-humidity' | 'dusty-haze' | 'breezy';
export type ForegroundObstruction = 'clean' | 'through-glass' | 'foreground-clutter';
export type BackgroundDynamics = 'empty' | 'casual' | 'busy';
export type GazeDirection = 'at-camera' | 'looking-away' | 'looking-down' | 'looking-out-window';
export type HandProp = 'none' | 'phone' | 'car-keys' | 'coffee-cup' | 'adjusting-glasses' | 'vape-cigarette';

export interface SubSceneCapability {
  outdoor?: boolean;
  captureTypes?: readonly CaptureType[];
  forceThroughGlassForCandid?: boolean;
  foregroundObstructions?: readonly ForegroundObstruction[];
  atmosphericConditions?: readonly AtmosphericCondition[];
}

export interface SceneCapability {
  captureTypes: readonly CaptureType[];
  atmosphericConditions: readonly AtmosphericCondition[];
  foregroundObstructions: readonly ForegroundObstruction[];
  backgroundDynamics: readonly BackgroundDynamics[];
  gazeDirections: readonly GazeDirection[];
  handProps: readonly HandProp[];
  outdoorByDefault: boolean;
  subScenes?: Readonly<Partial<Record<SubSceneId, SubSceneCapability>>>;
}

const OUTDOOR_ATMOSPHERE: readonly AtmosphericCondition[] = ['neutral', 'high-humidity', 'dusty-haze', 'breezy'];
const INDOOR_ATMOSPHERE: readonly AtmosphericCondition[] = ['neutral', 'high-humidity'];
const ALL_BACKGROUNDS: readonly BackgroundDynamics[] = ['empty', 'casual', 'busy'];
const SELFIE_OR_CANDID: readonly CaptureType[] = ['front-selfie', 'third-person-candid'];
const SELFIE_MIRROR_OR_CANDID: readonly CaptureType[] = ['front-selfie', 'mirror-selfie', 'third-person-candid'];

export const SCENE_CAPABILITIES: Readonly<Record<SceneFamilyId, SceneCapability>> = {
  'saudi-outdoor': {
    captureTypes: SELFIE_OR_CANDID,
    atmosphericConditions: OUTDOOR_ATMOSPHERE,
    foregroundObstructions: ['clean', 'foreground-clutter'],
    backgroundDynamics: ALL_BACKGROUNDS,
    gazeDirections: ['at-camera', 'looking-away', 'looking-down'],
    handProps: ['none', 'phone', 'car-keys', 'coffee-cup'],
    outdoorByDefault: true
  },
  'military-base': {
    captureTypes: SELFIE_OR_CANDID,
    atmosphericConditions: INDOOR_ATMOSPHERE,
    foregroundObstructions: ['clean', 'foreground-clutter'],
    backgroundDynamics: ALL_BACKGROUNDS,
    gazeDirections: ['at-camera', 'looking-away', 'looking-down'],
    handProps: ['none', 'phone', 'car-keys'],
    outdoorByDefault: false,
    subScenes: {
      'sector-parking': {
        outdoor: true,
        atmosphericConditions: OUTDOOR_ATMOSPHERE,
        foregroundObstructions: ['clean', 'foreground-clutter']
      }
    }
  },
  car: {
    captureTypes: SELFIE_OR_CANDID,
    atmosphericConditions: ['neutral'],
    foregroundObstructions: ['clean', 'through-glass'],
    backgroundDynamics: ALL_BACKGROUNDS,
    gazeDirections: ['at-camera', 'looking-away', 'looking-down', 'looking-out-window'],
    handProps: ['none', 'phone', 'car-keys', 'coffee-cup'],
    outdoorByDefault: false,
    subScenes: {
      'car-interior': {
        outdoor: false,
        captureTypes: SELFIE_OR_CANDID,
        forceThroughGlassForCandid: true,
        foregroundObstructions: ['clean', 'through-glass'],
        atmosphericConditions: ['neutral']
      },
      'beside-parked-car': {
        outdoor: true,
        captureTypes: SELFIE_OR_CANDID,
        foregroundObstructions: ['clean', 'foreground-clutter'],
        atmosphericConditions: OUTDOOR_ATMOSPHERE
      }
    }
  },
  'living-room': {
    captureTypes: SELFIE_OR_CANDID,
    atmosphericConditions: INDOOR_ATMOSPHERE,
    foregroundObstructions: ['clean', 'foreground-clutter'],
    backgroundDynamics: ALL_BACKGROUNDS,
    gazeDirections: ['at-camera', 'looking-away', 'looking-down', 'looking-out-window'],
    handProps: ['none', 'phone', 'coffee-cup'],
    outdoorByDefault: false
  },
  bedroom: {
    captureTypes: SELFIE_OR_CANDID,
    atmosphericConditions: INDOOR_ATMOSPHERE,
    foregroundObstructions: ['clean', 'foreground-clutter'],
    backgroundDynamics: ALL_BACKGROUNDS,
    gazeDirections: ['at-camera', 'looking-away', 'looking-down'],
    handProps: ['none', 'phone'],
    outdoorByDefault: false,
    subScenes: {
      'wardrobe-front': {
        captureTypes: SELFIE_MIRROR_OR_CANDID
      }
    }
  },
  gym: {
    captureTypes: SELFIE_OR_CANDID,
    atmosphericConditions: ['neutral', 'high-humidity'],
    foregroundObstructions: ['clean', 'foreground-clutter'],
    backgroundDynamics: ALL_BACKGROUNDS,
    gazeDirections: ['at-camera', 'looking-away', 'looking-down'],
    handProps: ['none', 'phone'],
    outdoorByDefault: false,
    subScenes: {
      'mirror-area': {
        captureTypes: SELFIE_MIRROR_OR_CANDID
      }
    }
  }
};

export const getSceneCapability = (sceneFamily: SceneFamilyId): SceneCapability => SCENE_CAPABILITIES[sceneFamily];

export const getSubSceneCapability = (sceneFamily: SceneFamilyId, subScene: SubSceneId | ''): SubSceneCapability | undefined =>
  subScene ? SCENE_CAPABILITIES[sceneFamily].subScenes?.[subScene] : undefined;

export const getAllowedCaptureTypes = (sceneFamily: SceneFamilyId, subScene: SubSceneId | ''): readonly CaptureType[] =>
  getSubSceneCapability(sceneFamily, subScene)?.captureTypes ?? getSceneCapability(sceneFamily).captureTypes;

export const isOutdoorContext = (sceneFamily: SceneFamilyId, subScene: SubSceneId | ''): boolean => {
  const capability = getSceneCapability(sceneFamily);
  return getSubSceneCapability(sceneFamily, subScene)?.outdoor ?? capability.outdoorByDefault;
};

export const getAllowedAtmosphere = (sceneFamily: SceneFamilyId, subScene: SubSceneId | ''): readonly AtmosphericCondition[] =>
  getSubSceneCapability(sceneFamily, subScene)?.atmosphericConditions ?? getSceneCapability(sceneFamily).atmosphericConditions;

export const getAllowedForegroundObstructions = (sceneFamily: SceneFamilyId, subScene: SubSceneId | ''): readonly ForegroundObstruction[] =>
  getSubSceneCapability(sceneFamily, subScene)?.foregroundObstructions ?? getSceneCapability(sceneFamily).foregroundObstructions;
