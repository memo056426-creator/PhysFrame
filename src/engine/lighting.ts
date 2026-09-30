export type EngineTimeOfDay = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';

export type LightingKind =
  | 'office-fluorescent'
  | 'window-daylight'
  | 'corridor-practical'
  | 'midday-sun'
  | 'natural-daylight'
  | 'golden-hour'
  | 'warm-street'
  | 'commercial-neon'
  | 'vehicle-interior'
  | 'street-through-glass'
  | 'phone-screen'
  | 'ceiling-practical'
  | 'mixed-night'
  | 'warm-lamp'
  | 'gym-practical'
  | 'unknown';

export interface LightingProfile {
  labelAR: string;
  kind: LightingKind;
  compatibleTimes: readonly EngineTimeOfDay[];
  ambientDescription: string;
  shadowDescription: string;
  soleAmbientSource?: boolean;
}

const ALL_TIMES: readonly EngineTimeOfDay[] = ['morning', 'midday', 'afternoon', 'sunset', 'night'];
const DAY_TIMES: readonly EngineTimeOfDay[] = ['morning', 'midday', 'afternoon', 'sunset'];
const NIGHT_TIMES: readonly EngineTimeOfDay[] = ['night'];

const profiles: LightingProfile[] = [
  {
    labelAR: 'إضاءة مكتب فلورسنت',
    kind: 'office-fluorescent',
    compatibleTimes: ALL_TIMES,
    ambientDescription: 'Cool overhead fluorescent office illumination with ordinary ceiling-source falloff and slight green-cyan color cast variation.',
    shadowDescription: 'Soft downward facial and clothing shadows with darker eye sockets and physically plausible desk-level occlusion.'
  },
  {
    labelAR: 'ضوء نهاري من النافذة',
    kind: 'window-daylight',
    compatibleTimes: DAY_TIMES,
    ambientDescription: 'Directional natural daylight entering from a real window, stronger on the window-facing side and weaker across the room.',
    shadowDescription: 'Soft directional shadows with believable room bounce and no artificial fill on the shadow side.'
  },
  {
    labelAR: 'إضاءة ممرات متوازية',
    kind: 'corridor-practical',
    compatibleTimes: ALL_TIMES,
    ambientDescription: 'Repeated overhead corridor practical lights creating spatially alternating pools of illumination.',
    shadowDescription: 'Multiple weak downward shadows whose direction follows the nearest ceiling fixture rather than studio fill.'
  },
  {
    labelAR: 'شمس الظهر',
    kind: 'midday-sun',
    compatibleTimes: ['midday'],
    ambientDescription: 'Harsh direct midday sunlight with high contrast and limited smartphone highlight recovery on bright surfaces.',
    shadowDescription: 'Strong short cast shadows beneath the nose, chin, clothing edges, and nearby objects.'
  },
  {
    labelAR: 'ضوء نهاري طبيعي',
    kind: 'natural-daylight',
    compatibleTimes: DAY_TIMES,
    ambientDescription: 'Ordinary natural daylight with realistic directional bias, environmental bounce, and non-studio contrast.',
    shadowDescription: 'Soft-to-moderate directional shadows consistent with available daylight and nearby surfaces.'
  },
  {
    labelAR: 'ساعة ذهبية (شروق/غروب)',
    kind: 'golden-hour',
    compatibleTimes: ['morning', 'sunset'],
    ambientDescription: 'Low-angle warm sunrise or sunset light with cooler ambient sky fill and physically directional falloff.',
    shadowDescription: 'Long warm-edged cast shadows with deeper cool-toned occlusion away from the sun.'
  },
  {
    labelAR: 'إنارة شارع دافئة',
    kind: 'warm-street',
    compatibleTimes: NIGHT_TIMES,
    ambientDescription: 'Warm sodium-like or LED street lighting from discrete outdoor fixtures with dark gaps between pools of light.',
    shadowDescription: 'Directional night shadows tied to nearby street fixtures with naturally underexposed background regions.'
  },
  {
    labelAR: 'إنارة نيون تجارية متناثرة',
    kind: 'commercial-neon',
    compatibleTimes: NIGHT_TIMES,
    ambientDescription: 'Scattered commercial neon and signage spill with mixed color temperatures and uneven local intensity.',
    shadowDescription: 'Irregular colored edge shadows and deep neutral occlusion where signage spill does not reach.'
  },
  {
    labelAR: 'إضاءة داخل السيارة',
    kind: 'vehicle-interior',
    compatibleTimes: ALL_TIMES,
    ambientDescription: 'Low-output vehicle cabin practical illumination localized near the dashboard and roof controls without illuminating the whole cabin evenly.',
    shadowDescription: 'Localized cabin shadows with rapid falloff toward seats, footwells, and the rear cabin.'
  },
  {
    labelAR: 'إضاءة الشارع عبر زجاج السيارة',
    kind: 'street-through-glass',
    compatibleTimes: NIGHT_TIMES,
    ambientDescription: 'Intermittent street illumination entering through vehicle glass with faint physically plausible glass reflections.',
    shadowDescription: 'Uneven moving or offset shadows caused by exterior street sources, with much of the cabin remaining dark.'
  },
  {
    labelAR: 'إضاءة شاشة الهاتف فقط',
    kind: 'phone-screen',
    compatibleTimes: NIGHT_TIMES,
    soleAmbientSource: true,
    ambientDescription: 'The smartphone screen is the ONLY ambient/practical light source: strongest on the face and near hand, moderate on the nearest shoulder, faint on adjacent surfaces, and rapidly falling to darkness beyond roughly 1-1.5 meters.',
    shadowDescription: 'Very local low-angle screen-light shadows with no lamp, ceiling-light, dashboard-light, daylight, or room-wide fill contribution.'
  },
  {
    labelAR: 'إضاءة سقف',
    kind: 'ceiling-practical',
    compatibleTimes: ALL_TIMES,
    ambientDescription: 'Ordinary residential ceiling illumination with realistic overhead falloff and mild room-surface bounce.',
    shadowDescription: 'Downward facial and clothing shadows with believable contact occlusion and no beauty-light fill.'
  },
  {
    labelAR: 'إنارة ليلية مختلطة',
    kind: 'mixed-night',
    compatibleTimes: NIGHT_TIMES,
    ambientDescription: 'Mixed low-output nighttime practical sources with naturally different color temperatures and uneven intensity.',
    shadowDescription: 'Overlapping weak shadows from actual practical fixtures with deep unfilled areas between them.'
  },
  {
    labelAR: 'إضاءة أباجورة دافئة',
    kind: 'warm-lamp',
    compatibleTimes: NIGHT_TIMES,
    ambientDescription: 'A single warm bedside or table lamp provides directional practical illumination from one side with rapid distance falloff.',
    shadowDescription: 'A clearly directional warm-side shadow pattern with the far side of the face and room remaining naturally darker.'
  },
  {
    labelAR: 'إضاءة النادي الرياضي',
    kind: 'gym-practical',
    compatibleTimes: ALL_TIMES,
    ambientDescription: 'Overhead commercial gym lighting with broad practical coverage, reflective highlights on equipment, and ordinary mixed fixture variation.',
    shadowDescription: 'Multiple modest downward shadows from ceiling fixtures with occlusion from equipment and bodies.'
  }
];

export const LIGHTING_PROFILES: Readonly<Record<string, LightingProfile>> = Object.freeze(
  Object.fromEntries(profiles.map(profile => [profile.labelAR, profile]))
);

const UNKNOWN_PROFILE: LightingProfile = {
  labelAR: '',
  kind: 'unknown',
  compatibleTimes: ALL_TIMES,
  ambientDescription: 'Natural available light with physically plausible falloff and no impossible fill.',
  shadowDescription: 'Physically plausible shadows consistent with the visible light sources.'
};

export const getLightingProfile = (label: string): LightingProfile =>
  LIGHTING_PROFILES[label] ?? { ...UNKNOWN_PROFILE, labelAR: label };

const timePreference = (profile: LightingProfile, timeOfDay: EngineTimeOfDay): number => {
  if (!profile.compatibleTimes.includes(timeOfDay)) return Number.NEGATIVE_INFINITY;

  let score = 10;
  if (timeOfDay === 'sunset' && profile.kind === 'golden-hour') score += 100;
  if (timeOfDay === 'morning' && ['natural-daylight', 'window-daylight', 'golden-hour'].includes(profile.kind)) score += 70;
  if (timeOfDay === 'midday' && profile.kind === 'midday-sun') score += 100;
  if (timeOfDay === 'afternoon' && ['natural-daylight', 'window-daylight'].includes(profile.kind)) score += 70;
  if (timeOfDay === 'night' && ['warm-street', 'commercial-neon', 'street-through-glass', 'phone-screen', 'mixed-night', 'warm-lamp', 'vehicle-interior'].includes(profile.kind)) score += 80;
  if (profile.kind === 'office-fluorescent' || profile.kind === 'corridor-practical' || profile.kind === 'ceiling-practical' || profile.kind === 'gym-practical') score += 20;
  return score;
};

export interface ResolveLightingInput {
  lightingMode: string;
  allowedLighting: readonly string[];
  timeOfDay: EngineTimeOfDay;
}

export interface ResolveLightingResult {
  lightingMode: string;
  timeOfDay: EngineTimeOfDay;
  profile: LightingProfile;
  changed: boolean;
}

export const resolveLightingCompatibility = ({
  lightingMode,
  allowedLighting,
  timeOfDay
}: ResolveLightingInput): ResolveLightingResult => {
  const selected = getLightingProfile(lightingMode);
  let resolvedTime = timeOfDay;

  // "Phone screen only" is a dark-scene ambient model. Direct capture flash, when enabled,
  // remains a separate camera event and does not turn on any other practical light.
  if (selected.kind === 'phone-screen') resolvedTime = 'night';

  if (allowedLighting.includes(lightingMode) && selected.compatibleTimes.includes(resolvedTime)) {
    return { lightingMode, timeOfDay: resolvedTime, profile: selected, changed: resolvedTime !== timeOfDay };
  }

  const candidates = allowedLighting
    .map(label => getLightingProfile(label))
    .filter(profile => profile.compatibleTimes.includes(resolvedTime))
    .sort((a, b) => timePreference(b, resolvedTime) - timePreference(a, resolvedTime));

  const fallback = candidates[0] ?? getLightingProfile(allowedLighting[0] ?? lightingMode);
  const resolvedMode = fallback.labelAR || allowedLighting[0] || lightingMode;

  return {
    lightingMode: resolvedMode,
    timeOfDay: resolvedTime,
    profile: fallback,
    changed: resolvedMode !== lightingMode || resolvedTime !== timeOfDay
  };
};
