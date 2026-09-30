export type VehicleRole = 'driver' | 'front-passenger' | 'generic-front-seat' | 'none';

export interface VehicleSemanticContext {
  visibleEnvironment: string;
  poseAndContact: string;
}

export interface VehicleGeometryProfile {
  role: VehicleRole;
  sceneGeometry: string;
  hardConstraints: string[];
  negativeConstraints: string[];
}

const EMPTY_PROFILE: VehicleGeometryProfile = {
  role: 'none',
  sceneGeometry: '',
  hardConstraints: [],
  negativeConstraints: []
};

const isCarContext = (visibleEnvironment: string): boolean =>
  /ordinary realistic السيارة setting|\bcar\b|\bvehicle\b/i.test(visibleEnvironment);

export const resolveVehicleRole = (context: VehicleSemanticContext): VehicleRole => {
  if (!isCarContext(context.visibleEnvironment)) return 'none';

  if (/خلف المقود والسيارة متوقفة|behind the steering wheel|driver'?s seat/i.test(context.poseAndContact)) {
    return 'driver';
  }

  if (/جالس في مقعد الراكب|front[- ]passenger|passenger seat/i.test(context.poseAndContact)) {
    return 'front-passenger';
  }

  if (/جالس بهدوء داخل السيارة|inside the car|inside the vehicle/i.test(context.poseAndContact)) {
    return 'generic-front-seat';
  }

  return 'none';
};

export const buildVehicleGeometry = (context: VehicleSemanticContext): VehicleGeometryProfile => {
  const role = resolveVehicleRole(context);
  if (role !== 'driver') {
    return { ...EMPTY_PROFILE, role };
  }

  return {
    role: 'driver',
    sceneGeometry:
      "STRICT VEHICLE GEOMETRY: The subject occupies the FRONT-LEFT DRIVER'S SEAT of a LEFT-HAND-DRIVE vehicle. The steering wheel is physically centered directly in front of the subject's torso and attached to the steering column and dashboard. The driver-side door and side window are immediately to the subject's left. The center console and front-passenger seat are to the subject's right. The rear bench remains behind the front seats. Preserve real unmirrored LHD cabin geometry in the final image; do not swap or reinterpret the cabin layout. If the seatbelt is visible, it originates at the driver's left-side B-pillar / upper anchor, crosses diagonally over the torso, and terminates toward the right-side buckle beside the center console.",
    hardConstraints: [
      "The subject MUST remain seated in the front-left driver's seat of a left-hand-drive vehicle",
      "The steering wheel MUST remain centered directly in front of the driver's torso on the steering-column axis",
      'The steering wheel MUST be physically connected to the steering column and dashboard, never floating or detached',
      "The driver-side door and side window MUST remain immediately to the driver's left",
      "The center console and front-passenger seat MUST remain to the driver's right",
      'Preserve the real unmirrored LHD cabin orientation in the final generated image',
      'Do not substitute the passenger seat for the driver position',
      'The pelvis remains centered on the driver-seat cushion and the torso remains aligned with the driver-seat backrest',
      'A visible seatbelt must run from the left-side B-pillar across the torso toward the right-side buckle beside the center console'
    ],
    negativeConstraints: [
      'passenger-seat placement',
      'right-hand-drive cabin',
      'mirrored cabin layout',
      'steering wheel beside subject',
      'steering wheel behind subject',
      'detached steering wheel',
      'floating steering wheel',
      'steering wheel on passenger side',
      'driver sitting outside steering-column axis',
      'center console on wrong side',
      'swapped driver and passenger seats'
    ]
  };
};
