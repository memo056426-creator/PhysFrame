import type { GroupSelfieCompanionCount } from '../engine/groupSelfie';
import type { LightingKind } from '../engine/lighting';
import type { SubSceneId } from '../data/subScenes';

export type { GroupSelfieCompanionCount };

export type CaptureType = 'front-selfie' | 'mirror-selfie' | 'third-person-candid';
export type Framing = 'head-shoulders' | 'chest-up' | 'half-body';
export type CameraAngle = 'eye-level' | 'slightly-high' | 'slightly-low' | 'slightly-off-center';
export type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';
export type RealismStyle = 'raw-candid' | 'cinematic-realism' | 'anti-ai-raw';
export type SceneFamilyId = 'bedroom' | 'living-room' | 'saudi-outdoor' | 'gym' | 'car' | 'military-base';

export type LensCondition = 'modern-iphone' | 'budget-android' | 'smudged-lens';
export type ClothingCondition = 'crisp' | 'worn-all-day' | 'vintage-washed';
export type AtmosphericCondition = 'neutral' | 'high-humidity' | 'dusty-haze' | 'breezy';
export type ForegroundObstruction = 'clean' | 'through-glass' | 'foreground-clutter';

export type GazeDirection = 'at-camera' | 'looking-away' | 'looking-down' | 'looking-out-window';
export type HandProp = 'none' | 'phone' | 'car-keys' | 'coffee-cup' | 'adjusting-glasses' | 'vape-cigarette';
export type FacialHairState = 'clean-shaven' | '3-day-stubble' | 'full-beard-neat' | 'full-beard-unkempt';
export type FlashMode = 'no-flash' | 'direct-flash' | 'ambient-only';
export type BackgroundDynamics = 'empty' | 'casual' | 'busy';
export type FramingImperfection = 'perfect' | 'dutch-angle' | 'awkward-crop';

export interface SceneState {
  referenceImageId: string | null;
  hasGlasses: boolean;
  sceneFamily: SceneFamilyId | null;
  subScene: SubSceneId | '';
  activity: string;
  captureType: CaptureType;
  framing: Framing;
  cameraAngle: CameraAngle;
  framingImperfection: FramingImperfection;
  useDigitalZoom: boolean;
  pose: string;
  outfitId: string;
  hairStyle: string;
  expression: string;
  timeOfDay: TimeOfDay;
  lightingMode: LightingKind;
  environmentRealism: string;
  realismStyle: RealismStyle;
  lensCondition: LensCondition;
  clothingCondition: ClothingCondition;
  atmosphericCondition: AtmosphericCondition;
  foregroundObstruction: ForegroundObstruction;
  gazeDirection: GazeDirection;
  handProp: HandProp;
  facialHairState: FacialHairState;
  flashMode: FlashMode;
  backgroundDynamics: BackgroundDynamics;
  groupSelfieEnabled: boolean;
  groupSelfieCompanionCount: GroupSelfieCompanionCount;
}

export interface DerivedSceneState {
  skinResponse: string;
  hairCondition: string;
  fabricBehavior: string[];
  shadowBehavior: string;
  environmentalLightBehavior: string;
  cameraDistance: string;
  visibleBackgroundElements: string[];
  contactPhysics: string[];
  reflectionRules: string[];
  realismConstraints: string[];
  lensEffects: string;
  handPropDetails: string;
  facialHairDetails: string;
  flashEffects: string;
  framingImperfectionDetails: string;
}

export interface SemanticScene {
  identity: string;
  body: string;
  captureMechanics: string;
  hair: string;
  expression: string;
  outfit: string;
  outfitPhysics: string;
  poseAndContact: string;
  visibleEnvironment: string;
  lighting: string;
  skinResponse: string;
  cameraRealism: string;
  styleConstraints: string;
  handProp: string;
  facialHair: string;
  flashDetails: string;
  shadowBehavior: string;
  backgroundDynamics: string;
  negativePrompt: string;
}

export interface SavedPreset {
  id: string;
  name: string;
  state: SceneState;
}
