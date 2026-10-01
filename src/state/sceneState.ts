import { EXPRESSIONS, HAIRSTYLES, SCENE_FAMILIES } from '../data/sceneOptions';
import { OUTFITS } from '../data/outfits';
import { resolveSceneConflicts } from '../engine/rules';
import type {
  BackgroundDynamics,
  CameraAngle,
  CaptureType,
  Framing,
  FramingImperfection,
  GroupSelfieCompanionCount,
  RealismStyle,
  SceneFamilyId,
  SceneState,
  TimeOfDay
} from '../types/scene';

export const DEFAULT_STATE: SceneState = {
  referenceImageId: null,
  hasGlasses: false,
  sceneFamily: null,
  subScene: '',
  activity: '',
  captureType: 'front-selfie',
  framing: 'chest-up',
  cameraAngle: 'eye-level',
  framingImperfection: 'perfect',
  useDigitalZoom: false,
  pose: '',
  outfitId: 'mil3',
  hairStyle: 'h2',
  expression: 'e1',
  timeOfDay: 'midday',
  lightingMode: '',
  environmentRealism: 'رسمية ومنظمة',
  realismStyle: 'anti-ai-raw',
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
  groupSelfieCompanionCount: 2
};

export const normalizeSceneState = (candidate: unknown): SceneState => {
  const raw: Record<string, unknown> = candidate && typeof candidate === 'object'
    ? { ...(candidate as Record<string, unknown>) }
    : {};

  if (raw.backgroundDynamics === 'empty-still') raw.backgroundDynamics = 'empty';
  if (raw.backgroundDynamics === 'casual-indifferent') raw.backgroundDynamics = 'casual';
  if (raw.backgroundDynamics === 'busy-motion') raw.backgroundDynamics = 'busy';

  const next: SceneState = { ...DEFAULT_STATE, ...(raw as Partial<SceneState>) };

  const sceneIds: SceneFamilyId[] = ['bedroom', 'living-room', 'saudi-outdoor', 'gym', 'car', 'military-base'];
  const captureTypes: CaptureType[] = ['front-selfie', 'mirror-selfie', 'third-person-candid'];
  const framings: Framing[] = ['head-shoulders', 'chest-up', 'half-body'];
  const angles: CameraAngle[] = ['eye-level', 'slightly-high', 'slightly-low', 'slightly-off-center'];
  const times: TimeOfDay[] = ['morning', 'midday', 'afternoon', 'sunset', 'night'];
  const realismStyles: RealismStyle[] = ['raw-candid', 'cinematic-realism', 'anti-ai-raw'];
  const backgrounds: BackgroundDynamics[] = ['empty', 'casual', 'busy'];
  const framingImperfections: FramingImperfection[] = ['perfect', 'dutch-angle', 'awkward-crop'];
  const groupSelfieCounts: GroupSelfieCompanionCount[] = [1, 2, 3];

  if (next.sceneFamily && !sceneIds.includes(next.sceneFamily)) next.sceneFamily = null;
  if (!captureTypes.includes(next.captureType)) next.captureType = DEFAULT_STATE.captureType;
  if (!framings.includes(next.framing)) next.framing = DEFAULT_STATE.framing;
  if (!angles.includes(next.cameraAngle)) next.cameraAngle = DEFAULT_STATE.cameraAngle;
  if (!times.includes(next.timeOfDay)) next.timeOfDay = DEFAULT_STATE.timeOfDay;
  if (!realismStyles.includes(next.realismStyle)) next.realismStyle = DEFAULT_STATE.realismStyle;
  if (!backgrounds.includes(next.backgroundDynamics)) next.backgroundDynamics = DEFAULT_STATE.backgroundDynamics;
  if (!framingImperfections.includes(next.framingImperfection)) next.framingImperfection = DEFAULT_STATE.framingImperfection;
  if (!groupSelfieCounts.includes(next.groupSelfieCompanionCount)) next.groupSelfieCompanionCount = DEFAULT_STATE.groupSelfieCompanionCount;

  next.hasGlasses = Boolean(next.hasGlasses);
  next.useDigitalZoom = Boolean(next.useDigitalZoom);
  next.groupSelfieEnabled = Boolean(next.groupSelfieEnabled);

  if (!OUTFITS.some(item => item.id === next.outfitId)) next.outfitId = DEFAULT_STATE.outfitId;
  if (!HAIRSTYLES.some(item => item.id === next.hairStyle)) next.hairStyle = DEFAULT_STATE.hairStyle;
  if (!EXPRESSIONS.some(item => item.id === next.expression)) next.expression = DEFAULT_STATE.expression;

  return resolveSceneConflicts(next, next.sceneFamily ? SCENE_FAMILIES[next.sceneFamily] : undefined);
};
