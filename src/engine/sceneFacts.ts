import type { SceneState } from '../types/scene';
import { getLightingProfile, type LightingKind } from './lighting';
import type { VehicleRole } from './vehicle';

export type VehicleDriveSide = 'lhd' | 'rhd' | null;

export interface SceneFacts {
  sceneFamily: SceneState['sceneFamily'];
  subScene: SceneState['subScene'];
  activity: SceneState['activity'];
  pose: SceneState['pose'];
  framing: SceneState['framing'];
  cameraAngle: SceneState['cameraAngle'];
  hasGlasses: boolean;
  backgroundDynamics: SceneState['backgroundDynamics'];
  captureType: SceneState['captureType'];
  useDigitalZoom: boolean;
  lightingMode: LightingKind;
  lightingSoleAmbientSource: boolean;
  timeOfDay: SceneState['timeOfDay'];
  mirrorReflectionRequired: boolean;
  selfieArmGeometryRequired: boolean;
  externalPhotographer: boolean;
  visiblePhoneRequested: boolean;
  visiblePhoneAllowed: boolean;
  vehicleRole: VehicleRole;
  vehicleDriveSide: VehicleDriveSide;
}

export const resolveVehicleRoleFromState = (state: SceneState): VehicleRole => {
  if (state.sceneFamily !== 'car') return 'none';

  if (state.activity === 'parked-behind-wheel') return 'driver';
  if (state.activity === 'passenger-seat') return 'front-passenger';
  if (state.activity === 'seated-calm-in-car') return 'generic-front-seat';

  return 'none';
};

export const buildSceneFacts = (state: SceneState): SceneFacts => {
  const vehicleRole = resolveVehicleRoleFromState(state);
  const lightingProfile = getLightingProfile(state.lightingMode);

  return {
    sceneFamily: state.sceneFamily,
    subScene: state.subScene,
    activity: state.activity,
    pose: state.pose,
    framing: state.framing,
    cameraAngle: state.cameraAngle,
    hasGlasses: state.hasGlasses,
    backgroundDynamics: state.backgroundDynamics,
    captureType: state.captureType,
    useDigitalZoom: state.useDigitalZoom,
    lightingMode: state.lightingMode,
    lightingSoleAmbientSource: Boolean(lightingProfile.soleAmbientSource),
    timeOfDay: state.timeOfDay,
    mirrorReflectionRequired: state.captureType === 'mirror-selfie',
    selfieArmGeometryRequired: state.captureType === 'front-selfie',
    externalPhotographer: state.captureType === 'third-person-candid',
    visiblePhoneRequested: state.handProp === 'phone',
    visiblePhoneAllowed: state.captureType !== 'front-selfie',
    vehicleRole,
    vehicleDriveSide: vehicleRole === 'driver' ? 'lhd' : null
  };
};
