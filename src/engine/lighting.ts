import { isOutdoorContext, type SceneFamilyId } from './capabilities';

export type EngineTimeOfDay = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';
export type LightingContext = 'indoor' | 'outdoor' | 'vehicle';

export type LightingKind =
  | 'office-fluorescent'
  | 'window-daylight'
  | 'corridor-practical'
  | 'midday-sun'
  | 'natural-daylight'
  | 'golden-hour'
  | 'morning-side-sun'
  | 'open-shade'
  | 'overcast-sky'
  | 'wall-bounce-daylight'
  | 'curtain-diffused-daylight'
  | 'afternoon-side-sun'
  | 'blue-hour'
  | 'warm-street'
  | 'cool-street-led'
  | 'commercial-neon'
  | 'storefront-spill'
  | 'parking-lot-night'
  | 'security-flood'
  | 'vehicle-interior'
  | 'vehicle-day-through-glass'
  | 'street-through-glass'
  | 'dashboard-glow'
  | 'phone-screen'
  | 'ceiling-practical'
  | 'warm-ceiling-practical'
  | 'mixed-night'
  | 'warm-lamp'
  | 'doorway-spill'
  | 'tv-spill'
  | 'gym-practical'
  | 'gym-led-cool'
  | 'unknown';

export interface LightingProfile {
  labelAR: string;
  kind: LightingKind;
  compatibleTimes: readonly EngineTimeOfDay[];
  contexts: readonly LightingContext[];
  sceneFamilies?: readonly SceneFamilyId[];
  subSceneKeywords?: readonly string[];
  ambientDescription: string;
  shadowDescription: string;
  recommendationReasonAR: string;
  soleAmbientSource?: boolean;
  sensorDescription?: string;
  subjectResponseDescription?: string;
  eyewearEffectDescription?: string;
  eyewearShadowDescription?: string;
}

export interface LightingSuggestion {
  labelAR: string;
  score: number;
  reasonAR: string;
  profile: LightingProfile;
}

export interface LightingSceneInput {
  sceneFamily: SceneFamilyId;
  subScene: string;
  timeOfDay: EngineTimeOfDay;
  activity?: string;
}

const ALL_TIMES: readonly EngineTimeOfDay[] = ['morning', 'midday', 'afternoon', 'sunset', 'night'];
const DAY_TIMES: readonly EngineTimeOfDay[] = ['morning', 'midday', 'afternoon', 'sunset'];
const CORE_DAY_TIMES: readonly EngineTimeOfDay[] = ['morning', 'midday', 'afternoon'];
const NIGHT_TIMES: readonly EngineTimeOfDay[] = ['night'];
const INDOOR: readonly LightingContext[] = ['indoor'];
const OUTDOOR: readonly LightingContext[] = ['outdoor'];
const VEHICLE: readonly LightingContext[] = ['vehicle'];
const INDOOR_OR_VEHICLE: readonly LightingContext[] = ['indoor', 'vehicle'];
const OUTDOOR_OR_VEHICLE: readonly LightingContext[] = ['outdoor', 'vehicle'];

const profiles: LightingProfile[] = [
  {
    labelAR: 'إضاءة مكتب فلورسنت',
    kind: 'office-fluorescent',
    compatibleTimes: ALL_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['military-base'],
    ambientDescription: 'Cool overhead fluorescent office illumination from real ceiling fixtures, with ordinary inverse-square falloff, mild fixture-to-fixture variation, and a slight green-cyan color cast rather than perfectly neutral white.',
    shadowDescription: 'Soft downward facial and clothing shadows with darker eye sockets and physically plausible desk-level occlusion; no frontal beauty fill.',
    recommendationReasonAR: 'مناسب للمكاتب العسكرية والإدارية لأن مصدره سقفي واقعي ومتكرر.',
    sensorDescription: 'slight automatic white-balance drift and mild green-channel bias typical of mixed fluorescent smartphone capture'
  },
  {
    labelAR: 'ضوء نهاري من النافذة',
    kind: 'window-daylight',
    compatibleTimes: DAY_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['military-base', 'living-room'],
    ambientDescription: 'Directional natural daylight entering from a real side window, strongest on the window-facing side and progressively weaker across the room, with believable wall and floor bounce but no impossible shadow-side fill.',
    shadowDescription: 'Soft directional facial shadows with clear source-side logic, gentle penumbra, and darker occlusion on the side turned away from the window.',
    recommendationReasonAR: 'أفضل عندما يكون المشهد قريبًا من نافذة أو داخل غرفة تستقبل ضوء النهار.'
  },
  {
    labelAR: 'إضاءة ممرات متوازية',
    kind: 'corridor-practical',
    compatibleTimes: ALL_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['military-base'],
    subSceneKeywords: ['ممر'],
    ambientDescription: 'Repeated overhead corridor practical lights creating alternating pools of brightness and darker gaps along the hallway instead of perfectly even illumination.',
    shadowDescription: 'Several weak downward shadows whose dominant direction follows the nearest ceiling fixture, with realistic face-to-wall and body-to-floor occlusion.',
    recommendationReasonAR: 'مقترحة للممرات لأنها تحاكي تتابع المصابيح السقفية على طول الممر.'
  },
  {
    labelAR: 'شمس الظهر',
    kind: 'midday-sun',
    compatibleTimes: ['midday'],
    contexts: OUTDOOR,
    ambientDescription: 'Harsh direct midday sunlight from a high solar angle with strong luminance contrast, bright pavement bounce, and limited smartphone highlight recovery on pale surfaces.',
    shadowDescription: 'Strong short cast shadows beneath the nose, chin, clothing edges, vehicles, and nearby objects, with compact dark contact shadows at the feet.',
    recommendationReasonAR: 'الأكثر واقعية للمشاهد الخارجية وقت الظهر عندما تكون الشمس عالية وقاسية.',
    sensorDescription: 'limited smartphone highlight recovery with mild chromatic fringing on extreme sunlit contrast edges',
    subjectResponseDescription: 'slight natural forehead and nose sheen catching the direct sun',
    eyewearShadowDescription: 'small physically consistent eyeglass-frame shadows on the upper cheeks'
  },
  {
    labelAR: 'ضوء نهاري طبيعي',
    kind: 'natural-daylight',
    compatibleTimes: DAY_TIMES,
    contexts: ['indoor', 'outdoor'],
    ambientDescription: 'Ordinary available daylight with a physically believable directional bias, environmental bounce, non-studio contrast, and natural exposure variation across the scene.',
    shadowDescription: 'Soft-to-moderate directional shadows consistent with the visible openings, sky direction, architecture, and nearby surfaces.',
    recommendationReasonAR: 'خيار نهاري مرن عندما لا يحتاج المشهد مصدرًا أكثر تخصصًا.'
  },
  {
    labelAR: 'شمس صباحية جانبية ناعمة',
    kind: 'morning-side-sun',
    compatibleTimes: ['morning'],
    contexts: OUTDOOR,
    ambientDescription: 'Low-to-moderate angle morning sunlight arriving from one side, warmer and softer than midday sun, with cool open-sky fill remaining on the opposite side.',
    shadowDescription: 'Moderately elongated side-cast shadows with soft-edged penumbra and visible contact darkening where shoes and objects meet the ground.',
    recommendationReasonAR: 'ممتازة لصباح خارجي طبيعي بظلال جانبية ألطف من الظهر.'
  },
  {
    labelAR: 'ظل مفتوح نهاري',
    kind: 'open-shade',
    compatibleTimes: CORE_DAY_TIMES,
    contexts: OUTDOOR,
    ambientDescription: 'Open-shade daylight beneath a building edge, awning, tree canopy, or shaded street side: the subject is lit mainly by broad blue-sky illumination and reflected ground light while direct sun remains outside the shaded area.',
    shadowDescription: 'Low-contrast broad shadows on the subject with stronger sunlit-vs-shaded contrast visible in the environment behind or beside him.',
    recommendationReasonAR: 'من أكثر الخيارات واقعية للوجوه خارجًا لأنه يمنع شمسًا مباشرة مصطنعة على الوجه.'
  },
  {
    labelAR: 'ضوء سماء غائمة منتشر',
    kind: 'overcast-sky',
    compatibleTimes: CORE_DAY_TIMES,
    contexts: OUTDOOR,
    ambientDescription: 'Broad overcast-sky illumination acting as a very large natural source, with subdued highlights, low directional contrast, and realistic ambient brightness from the entire visible sky hemisphere.',
    shadowDescription: 'Very soft shallow cast shadows, preserved contact shadows, and no studio-like key-light direction.',
    recommendationReasonAR: 'مناسب للنهار الهادئ والمتوازن عندما تريد ضوءًا طبيعيًا منتشرًا.'
  },
  {
    labelAR: 'ارتداد ضوء نهاري من جدار فاتح',
    kind: 'wall-bounce-daylight',
    compatibleTimes: CORE_DAY_TIMES,
    contexts: OUTDOOR,
    ambientDescription: 'Indirect daylight reflected from a nearby pale wall or building facade, producing a broad secondary source with lower intensity than direct sun and a slightly warm material-dependent color shift.',
    shadowDescription: 'Soft side illumination with gentle face modeling, preserved shadow-side depth, and no impossible bilateral fill.',
    recommendationReasonAR: 'ذكية للشوارع والفلل والمواقف التي تحتوي جدرانًا فاتحة تعكس الشمس.'
  },
  {
    labelAR: 'ضوء نافذة منتشر عبر ستارة',
    kind: 'curtain-diffused-daylight',
    compatibleTimes: DAY_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['bedroom', 'living-room'],
    ambientDescription: 'Natural daylight diffused through a real curtain or sheer fabric, producing a broad side source with visible intensity falloff away from the curtain and no direct exterior view required.',
    shadowDescription: 'Soft directional gradients across the face and bedding or furniture, with deeper occlusion underneath the chin, arms, and contact surfaces.',
    recommendationReasonAR: 'مثالية لغرفة النوم والصالة عندما يكون الضوء داخلًا عبر الستارة بدل ظهور نافذة مباشرة.'
  },
  {
    labelAR: 'شمس عصر جانبية',
    kind: 'afternoon-side-sun',
    compatibleTimes: ['afternoon'],
    contexts: OUTDOOR,
    ambientDescription: 'Directional late-afternoon sunlight from a lower side angle than midday, with warmer highlights, stronger facade reflections, and realistic environmental sky fill.',
    shadowDescription: 'Longer side-cast shadows than midday with distinct object silhouettes and natural penumbra widening with distance.',
    recommendationReasonAR: 'مقترحة للعصر الخارجي لأنها تعطي اتجاهًا واضحًا للشمس من دون مبالغة الساعة الذهبية.'
  },
  {
    labelAR: 'ساعة ذهبية (شروق/غروب)',
    kind: 'golden-hour',
    compatibleTimes: ['morning', 'sunset'],
    contexts: OUTDOOR,
    ambientDescription: 'Low-angle warm sunrise or sunset light with cooler ambient sky fill, directional warm edge illumination, and physically correct rapid changes in brightness across occluded surfaces.',
    shadowDescription: 'Long warm-edged cast shadows with deeper cool-toned occlusion away from the sun and strong geometry-dependent directionality.',
    recommendationReasonAR: 'الأفضل للشروق أو الغروب عندما يكون مصدر الشمس منخفضًا وواضح الاتجاه.',
    subjectResponseDescription: 'warm directional edge light with subtle subsurface scattering at the ears where directly backlit'
  },
  {
    labelAR: 'الشفق الأزرق بعد الغروب',
    kind: 'blue-hour',
    compatibleTimes: ['sunset'],
    contexts: OUTDOOR,
    ambientDescription: 'Post-sunset blue-hour sky illumination with cool low-intensity ambient light, no visible direct sun, and the first practical lights beginning to separate from the darker environment.',
    shadowDescription: 'Very soft cool ambient shadows with deeper contact occlusion and localized warmer practical-light shadows only where fixtures are actually present.',
    recommendationReasonAR: 'مناسب للحظات بعد اختفاء الشمس مباشرة قبل أن يتحول المشهد إلى ليل كامل.',
    sensorDescription: 'moderate smartphone shadow noise and slightly reduced micro-contrast in the low blue-hour luminance'
  },
  {
    labelAR: 'ضوء نهاري عبر زجاج السيارة',
    kind: 'vehicle-day-through-glass',
    compatibleTimes: DAY_TIMES,
    contexts: VEHICLE,
    sceneFamilies: ['car'],
    ambientDescription: 'Daylight entering the vehicle cabin through windshield and side glass, brighter on surfaces facing the windows, with realistic roof and pillar occlusion and subtle glass tint affecting color and intensity.',
    shadowDescription: 'Window-shaped directional cabin shadows with darker footwells and seat creases, plus natural pillar and dashboard occlusion.',
    recommendationReasonAR: 'الخيار النهاري الأدق داخل السيارة لأنه يحسب الزجاج والسقف والقوائم بدل إضاءة المقصورة بالتساوي.',
    sensorDescription: 'restrained HDR recovery between bright exterior windows and the darker cabin interior'
  },
  {
    labelAR: 'إنارة شارع دافئة',
    kind: 'warm-street',
    compatibleTimes: NIGHT_TIMES,
    contexts: OUTDOOR_OR_VEHICLE,
    ambientDescription: 'Warm sodium-like or warm LED street lighting from discrete outdoor fixtures, producing localized pools of illumination separated by genuinely dark gaps.',
    shadowDescription: 'Directional night shadows tied to the nearest street fixture with naturally underexposed background regions beyond the pool of light.',
    recommendationReasonAR: 'طبيعية للشوارع والأحياء السكنية ليلًا عندما تكون أعمدة الإنارة هي المصدر الأساسي.',
    sensorDescription: 'realistic high-ISO grain in underexposed regions, mild warm white-balance drift, and restrained computational noise reduction',
    eyewearEffectDescription: 'faint warm practical-light reflections on the eyeglass lenses following the actual street-source direction'
  },
  {
    labelAR: 'مصباح شارع LED أبيض',
    kind: 'cool-street-led',
    compatibleTimes: NIGHT_TIMES,
    contexts: OUTDOOR_OR_VEHICLE,
    ambientDescription: 'Cool-white LED street lighting from a specific overhead or side fixture with hard local highlights, a cooler color temperature than nearby warm sources, and rapid falloff outside its beam.',
    shadowDescription: 'Distinct directional cool-toned shadows with dark unfilled areas behind bodies, parked cars, curbs, and walls.',
    recommendationReasonAR: 'مناسب للشوارع والمواقف الحديثة التي تستخدم أعمدة LED بيضاء.',
    sensorDescription: 'high-ISO shadow grain with slightly cool automatic white-balance bias and clipped micro-highlights on reflective edges',
    eyewearEffectDescription: 'small cool LED reflections appearing only on lens surfaces facing the fixture'
  },
  {
    labelAR: 'إنارة نيون تجارية متناثرة',
    kind: 'commercial-neon',
    compatibleTimes: NIGHT_TIMES,
    contexts: OUTDOOR_OR_VEHICLE,
    sceneFamilies: ['saudi-outdoor', 'car'],
    ambientDescription: 'Scattered commercial neon and signage spill from real storefront sources with mixed color temperatures, uneven local intensity, and no uniform colored wash across the whole scene.',
    shadowDescription: 'Irregular colored edge shadows and deep neutral occlusion where signage spill does not physically reach.',
    recommendationReasonAR: 'تعمل جيدًا قرب الشوارع التجارية والمقاهي والواجهات المضاءة ليلًا.',
    sensorDescription: 'mixed-color high-ISO smartphone response with mild channel clipping in saturated signage and realistic shadow noise',
    eyewearEffectDescription: 'tiny colored signage reflections constrained to the lens angle and source position'
  },
  {
    labelAR: 'توهج واجهة متجر أو مقهى',
    kind: 'storefront-spill',
    compatibleTimes: NIGHT_TIMES,
    contexts: OUTDOOR,
    sceneFamilies: ['saudi-outdoor'],
    subSceneKeywords: ['مقهى', 'تجاري'],
    ambientDescription: 'Warm-to-neutral light spilling outward from a nearby cafe or shop entrance, strongest close to the facade and doorway and rapidly weaker toward the street.',
    shadowDescription: 'Side-cast doorway or facade shadows with strong local falloff and a darker street-facing side when no second source is present.',
    recommendationReasonAR: 'مقترحة تلقائيًا أمام المقهى أو في الشارع التجاري لأن المصدر واضح وموجود داخل المشهد.',
    sensorDescription: 'ordinary night smartphone exposure with bright storefront highlights and visible fine grain in the darker street background'
  },
  {
    labelAR: 'إضاءة موقف سيارات علوية',
    kind: 'parking-lot-night',
    compatibleTimes: NIGHT_TIMES,
    contexts: OUTDOOR,
    sceneFamilies: ['military-base', 'saudi-outdoor', 'car'],
    subSceneKeywords: ['مواقف', 'موقف', 'السيارة'],
    ambientDescription: 'High-mounted parking-lot fixtures creating separated cones of light on asphalt, vehicle roofs, and shoulders, with realistic dark zones between poles and no room-like ambient fill.',
    shadowDescription: 'Downward elongated parking shadows offset from the nearest pole, strong vehicle occlusion, and compact tire-to-ground contact shadows.',
    recommendationReasonAR: 'الأكثر منطقية في المواقف ليلًا لأنها تربط الضوء بأعمدة عالية فوق الإسفلت.',
    sensorDescription: 'high-ISO grain in dark asphalt regions with clipped small highlights on vehicle paint and reflective trim'
  },
  {
    labelAR: 'إضاءة أمنية خارجية باردة',
    kind: 'security-flood',
    compatibleTimes: NIGHT_TIMES,
    contexts: OUTDOOR,
    sceneFamilies: ['military-base', 'saudi-outdoor'],
    ambientDescription: 'A cool exterior security floodlight mounted on a building or perimeter structure, illuminating only the physically exposed zone and leaving occluded areas substantially darker.',
    shadowDescription: 'Sharper single-direction security-light shadows on walls and ground with strong building-edge and vehicle occlusion.',
    recommendationReasonAR: 'مناسبة للمباني والمواقف الرسمية ليلًا عندما يكون مصدر الضوء أمنيًا ثابتًا.',
    sensorDescription: 'cool-biased nighttime exposure with visible shadow grain and restrained highlight clipping near the floodlit area'
  },
  {
    labelAR: 'إضاءة داخل السيارة',
    kind: 'vehicle-interior',
    compatibleTimes: ALL_TIMES,
    contexts: VEHICLE,
    sceneFamilies: ['car'],
    ambientDescription: 'Low-output vehicle cabin practical illumination localized near roof controls, console, or a real cabin lamp without illuminating the entire cabin evenly.',
    shadowDescription: 'Localized cabin shadows with rapid falloff toward seats, footwells, door pockets, and the rear cabin.',
    recommendationReasonAR: 'مناسبة داخل السيارة عندما تكون لمبة المقصورة أو وحدة السقف هي المصدر المرئي.',
    sensorDescription: 'mild cabin low-light noise where illumination falls off',
    eyewearEffectDescription: 'faint localized cabin-practical reflections on the eyeglass lenses'
  },
  {
    labelAR: 'إضاءة الشارع عبر زجاج السيارة',
    kind: 'street-through-glass',
    compatibleTimes: NIGHT_TIMES,
    contexts: VEHICLE,
    sceneFamilies: ['car'],
    ambientDescription: 'Intermittent exterior street illumination entering through windshield and side glass, with faint physically plausible window reflections and stronger exposure near the glass than deep in the cabin.',
    shadowDescription: 'Uneven offset cabin shadows caused by exterior fixtures, with most footwell and rear-cabin surfaces remaining naturally dark.',
    recommendationReasonAR: 'مقترحة داخل السيارة ليلًا لأنها تحافظ على مصدر الضوء خارج المقصورة خلف الزجاج.',
    sensorDescription: 'realistic high-ISO cabin grain, mild color-temperature drift, and restrained denoising in underexposed interior regions',
    eyewearEffectDescription: 'small moving or offset street-light reflections on the lenses only where geometry supports them'
  },
  {
    labelAR: 'إضاءة عدادات السيارة الخافتة',
    kind: 'dashboard-glow',
    compatibleTimes: NIGHT_TIMES,
    contexts: VEHICLE,
    sceneFamilies: ['car'],
    ambientDescription: 'Very low-output dashboard and instrument-cluster glow localized below the face and around the steering wheel, incapable of lighting the whole cabin, with exterior darkness remaining dominant.',
    shadowDescription: 'Subtle upward-biased near-face shadows from the instrument area with rapid falloff across the chest, seats, and roof liner.',
    recommendationReasonAR: 'مناسبة لداخل السيارة ليلًا عندما تريد ضوءًا خافتًا جدًا من العدادات بدل إنارة المقصورة.',
    sensorDescription: 'pronounced but natural low-light sensor grain, reduced color fidelity in shadows, and no artificial room-wide denoising',
    eyewearEffectDescription: 'tiny instrument-cluster reflections confined to the lower portion of one or both lenses depending on viewing angle'
  },
  {
    labelAR: 'إضاءة شاشة الهاتف فقط',
    kind: 'phone-screen',
    compatibleTimes: NIGHT_TIMES,
    contexts: INDOOR_OR_VEHICLE,
    soleAmbientSource: true,
    ambientDescription: 'The smartphone screen is the ONLY ambient/practical light source: strongest on the face and near hand, moderate on the nearest shoulder, faint on immediately adjacent surfaces, and rapidly falling to darkness beyond roughly 1-1.5 meters.',
    shadowDescription: 'Very local low-angle screen-light shadows with no lamp, ceiling-light, dashboard-light, daylight, street spill, or room-wide fill contribution.',
    recommendationReasonAR: 'ذكية عند استخدام الهاتف في غرفة أو سيارة مظلمة وتحتاج مصدرًا وحيدًا حقيقيًا.',
    sensorDescription: 'visible low-light sensor grain in dark regions, restrained shadow noise, reduced chroma fidelity, and no artificial room-wide denoising',
    subjectResponseDescription: 'localized cool screen reflection strongest on the face and nearest hand with rapid physical falloff',
    eyewearEffectDescription: 'microscopic phone-screen reflection visible in one eyeglass lens only when the angle permits'
  },
  {
    labelAR: 'إضاءة سقف',
    kind: 'ceiling-practical',
    compatibleTimes: ALL_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['living-room', 'bedroom'],
    ambientDescription: 'Ordinary residential ceiling illumination from a real overhead fixture with realistic falloff, mild room-surface bounce, and no frontal beauty fill.',
    shadowDescription: 'Downward facial and clothing shadows with believable contact occlusion under the chin, arms, furniture, and body-to-surface contacts.',
    recommendationReasonAR: 'خيار منزلي محايد عندما تكون إنارة السقف هي المصدر الواقعي الأساسي.'
  },
  {
    labelAR: 'إضاءة سقف منزلية دافئة',
    kind: 'warm-ceiling-practical',
    compatibleTimes: NIGHT_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['living-room', 'bedroom'],
    ambientDescription: 'Warm residential ceiling LED or bulb illumination from overhead, with mild cream-colored wall bounce, realistic brightness falloff toward room corners, and no studio fill.',
    shadowDescription: 'Warm downward facial and clothing shadows with darker eye sockets and localized furniture/contact occlusion.',
    recommendationReasonAR: 'مناسبة للصالة وغرفة النوم ليلًا عندما تكون إنارة البيت السقفية الدافئة هي المصدر الرئيسي.',
    sensorDescription: 'mild warm automatic white-balance drift with visible but restrained shadow noise'
  },
  {
    labelAR: 'إنارة ليلية مختلطة',
    kind: 'mixed-night',
    compatibleTimes: NIGHT_TIMES,
    contexts: ['indoor', 'outdoor', 'vehicle'],
    ambientDescription: 'Mixed low-output nighttime practical sources with naturally different color temperatures, unequal intensity, and visible source-specific falloff instead of a uniform cinematic wash.',
    shadowDescription: 'Overlapping weak shadows from actual practical fixtures with deep unfilled areas between source contributions.',
    recommendationReasonAR: 'خيار مرن عندما يظهر أكثر من مصدر عملي حقيقي في المشهد الليلي.',
    sensorDescription: 'realistic high-ISO grain, mild color-temperature drift, and restrained computational noise reduction',
    eyewearEffectDescription: 'faint practical-light reflections following the actual source directions rather than a generic glossy lens effect'
  },
  {
    labelAR: 'إضاءة أباجورة دافئة',
    kind: 'warm-lamp',
    compatibleTimes: NIGHT_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['bedroom', 'living-room'],
    ambientDescription: 'A single warm bedside or table lamp provides directional practical illumination from one side with rapid distance falloff and visibly darker room regions outside its reach.',
    shadowDescription: 'A clearly directional warm-side shadow pattern with the far side of the face and room remaining naturally darker.',
    recommendationReasonAR: 'مناسبة بجانب السرير أو الكنبة عندما تكون الأباجورة مصدرًا جانبيًا واضحًا.',
    sensorDescription: 'warm low-light smartphone response with fine shadow grain and restrained denoising'
  },
  {
    labelAR: 'ضوء ممر دافئ من الباب',
    kind: 'doorway-spill',
    compatibleTimes: NIGHT_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['bedroom', 'living-room'],
    ambientDescription: 'Warm light spilling through an open doorway from an adjacent hall, brightest on the floor and body surfaces directly exposed to the doorway and rapidly weaker behind furniture or farther into the room.',
    shadowDescription: 'Side-biased doorway shadows with clear occlusion from the doorframe, furniture, and body geometry; the room interior remains substantially darker away from the opening.',
    recommendationReasonAR: 'مقترحة للمشهد المنزلي الليلي عندما تريد ضوءًا واقعيًا داخلًا من خارج الغرفة.',
    sensorDescription: 'visible night grain in the darker room with stronger exposure near the doorway spill'
  },
  {
    labelAR: 'وهج تلفاز خافت',
    kind: 'tv-spill',
    compatibleTimes: NIGHT_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['living-room'],
    subSceneKeywords: ['التلفاز'],
    ambientDescription: 'Dim changing television-screen spill as a localized cool-to-neutral frontal-side source, strong only on nearby face and furniture surfaces and insufficient to illuminate the full room.',
    shadowDescription: 'Very soft low-output screen shadows with deep room darkness outside the television spill and preserved furniture contact occlusion.',
    recommendationReasonAR: 'مقترحة تلقائيًا أمام التلفاز ليلًا لأن الشاشة نفسها تصبح مصدرًا ضوئيًا منطقيًا.',
    sensorDescription: 'noticeable low-light smartphone grain, reduced micro-contrast, and mild color drift as screen content changes'
  },
  {
    labelAR: 'إضاءة النادي الرياضي',
    kind: 'gym-practical',
    compatibleTimes: ALL_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['gym'],
    ambientDescription: 'Overhead commercial gym lighting with broad but imperfect practical coverage, reflective highlights on metal equipment, and ordinary fixture-to-fixture intensity variation.',
    shadowDescription: 'Multiple modest downward shadows from ceiling fixtures with realistic occlusion from equipment, benches, and nearby bodies.',
    recommendationReasonAR: 'الخيار الأساسي للنادي لأنه يطابق الإضاءة التجارية السقفية المعتادة.'
  },
  {
    labelAR: 'مصابيح LED بيضاء للنادي',
    kind: 'gym-led-cool',
    compatibleTimes: ALL_TIMES,
    contexts: INDOOR,
    sceneFamilies: ['gym'],
    ambientDescription: 'Cool-white linear or panel LED gym fixtures overhead, producing crisp equipment reflections, slightly cool skin highlights, and realistic spatial variation between fixture rows.',
    shadowDescription: 'Several small downward shadow contributions with stronger occlusion under brows, jaw, arms, benches, and equipment frames.',
    recommendationReasonAR: 'مناسبة للنادي الحديث الذي يستخدم لوحات أو خطوط LED بيضاء باردة.',
    sensorDescription: 'slight cool automatic white-balance bias with restrained highlight clipping on polished gym equipment'
  }
];

export const LIGHTING_PROFILES: Readonly<Record<string, LightingProfile>> = Object.freeze(
  Object.fromEntries(profiles.map(profile => [profile.labelAR, profile]))
);

const UNKNOWN_PROFILE: LightingProfile = {
  labelAR: '',
  kind: 'unknown',
  compatibleTimes: ALL_TIMES,
  contexts: ['indoor', 'outdoor', 'vehicle'],
  ambientDescription: 'Natural available light with physically plausible falloff and no impossible fill.',
  shadowDescription: 'Physically plausible shadows consistent with the visible light sources.',
  recommendationReasonAR: 'إضاءة متاحة عامة.'
};

export const getLightingProfile = (label: string): LightingProfile =>
  LIGHTING_PROFILES[label] ?? { ...UNKNOWN_PROFILE, labelAR: label };

export const inferLightingContext = (sceneFamily: SceneFamilyId, subScene: string): LightingContext => {
  if (sceneFamily === 'car' && subScene.includes('داخل')) return 'vehicle';
  return isOutdoorContext(sceneFamily, subScene) ? 'outdoor' : 'indoor';
};

const keywordMatch = (profile: LightingProfile, subScene: string): boolean =>
  !profile.subSceneKeywords?.length || profile.subSceneKeywords.some(keyword => subScene.includes(keyword));

const profileFitsScene = (profile: LightingProfile, sceneFamily: SceneFamilyId, subScene: string): boolean => {
  const context = inferLightingContext(sceneFamily, subScene);
  if (!profile.contexts.includes(context)) return false;
  if (profile.sceneFamilies?.length && !profile.sceneFamilies.includes(sceneFamily)) return false;
  if (!keywordMatch(profile, subScene)) return false;
  return true;
};

export const getSceneLightingProfiles = (sceneFamily: SceneFamilyId, subScene: string): readonly LightingProfile[] =>
  profiles.filter(profile => profileFitsScene(profile, sceneFamily, subScene));

export const getSceneLightingLabels = (sceneFamily: SceneFamilyId, subScene: string): string[] =>
  getSceneLightingProfiles(sceneFamily, subScene).map(profile => profile.labelAR);

const timePreference = (profile: LightingProfile, timeOfDay: EngineTimeOfDay): number => {
  if (!profile.compatibleTimes.includes(timeOfDay)) return Number.NEGATIVE_INFINITY;

  let score = 100;
  if (timeOfDay === 'sunset' && profile.kind === 'golden-hour') score += 110;
  if (timeOfDay === 'sunset' && profile.kind === 'blue-hour') score += 95;
  if (timeOfDay === 'morning' && ['morning-side-sun', 'window-daylight', 'curtain-diffused-daylight', 'natural-daylight'].includes(profile.kind)) score += 85;
  if (timeOfDay === 'midday' && profile.kind === 'midday-sun') score += 100;
  if (timeOfDay === 'midday' && ['open-shade', 'wall-bounce-daylight', 'overcast-sky'].includes(profile.kind)) score += 75;
  if (timeOfDay === 'afternoon' && profile.kind === 'afternoon-side-sun') score += 100;
  if (timeOfDay === 'afternoon' && ['open-shade', 'wall-bounce-daylight', 'natural-daylight'].includes(profile.kind)) score += 75;
  if (timeOfDay === 'night' && ['warm-street', 'cool-street-led', 'commercial-neon', 'storefront-spill', 'parking-lot-night', 'security-flood', 'street-through-glass', 'dashboard-glow', 'phone-screen', 'warm-ceiling-practical', 'mixed-night', 'warm-lamp', 'doorway-spill', 'tv-spill'].includes(profile.kind)) score += 80;
  if (['office-fluorescent', 'corridor-practical', 'ceiling-practical', 'gym-practical', 'gym-led-cool'].includes(profile.kind)) score += 25;
  return score;
};

const scenePreference = (profile: LightingProfile, input: LightingSceneInput): number => {
  const { sceneFamily, subScene, timeOfDay, activity = '' } = input;
  let score = 0;

  if (sceneFamily === 'car' && subScene.includes('داخل')) {
    if (timeOfDay === 'night' && ['street-through-glass', 'dashboard-glow', 'vehicle-interior', 'phone-screen'].includes(profile.kind)) score += 120;
    if (timeOfDay !== 'night' && profile.kind === 'vehicle-day-through-glass') score += 130;
  }

  if (sceneFamily === 'military-base') {
    if (subScene.includes('مكتب') && ['office-fluorescent', 'window-daylight'].includes(profile.kind)) score += 100;
    if (subScene.includes('ممر') && profile.kind === 'corridor-practical') score += 140;
    if (subScene.includes('مواقف')) {
      if (timeOfDay === 'night' && ['parking-lot-night', 'security-flood', 'cool-street-led'].includes(profile.kind)) score += 140;
      if (timeOfDay !== 'night' && ['midday-sun', 'open-shade', 'wall-bounce-daylight'].includes(profile.kind)) score += 95;
    }
  }

  if (sceneFamily === 'bedroom') {
    if (timeOfDay === 'night' && ['warm-lamp', 'warm-ceiling-practical', 'doorway-spill', 'phone-screen'].includes(profile.kind)) score += 105;
    if (timeOfDay !== 'night' && profile.kind === 'curtain-diffused-daylight') score += 120;
  }

  if (sceneFamily === 'living-room') {
    if (subScene.includes('النافذة') && ['window-daylight', 'curtain-diffused-daylight'].includes(profile.kind)) score += 130;
    if (subScene.includes('التلفاز') && timeOfDay === 'night' && profile.kind === 'tv-spill') score += 150;
    if (timeOfDay === 'night' && ['warm-ceiling-practical', 'warm-lamp', 'doorway-spill'].includes(profile.kind)) score += 85;
  }

  if (sceneFamily === 'gym' && ['gym-practical', 'gym-led-cool'].includes(profile.kind)) score += 130;

  if (sceneFamily === 'saudi-outdoor') {
    if (timeOfDay !== 'night' && ['open-shade', 'wall-bounce-daylight', 'natural-daylight'].includes(profile.kind)) score += 75;
    if (subScene.includes('مقهى') || subScene.includes('تجاري')) {
      if (timeOfDay === 'night' && ['storefront-spill', 'commercial-neon'].includes(profile.kind)) score += 145;
      if (timeOfDay !== 'night' && profile.kind === 'open-shade') score += 60;
    }
    if ((subScene.includes('فلل') || subScene.includes('سكني')) && timeOfDay === 'night' && ['warm-street', 'cool-street-led'].includes(profile.kind)) score += 100;
    if (subScene.includes('موقف') && timeOfDay === 'night' && profile.kind === 'parking-lot-night') score += 145;
  }

  if (activity.includes('الهاتف') || activity.includes('يستخدم الهاتف')) {
    if (timeOfDay === 'night' && profile.kind === 'phone-screen') score += 110;
  }
  if (activity.includes('قهوة') && sceneFamily === 'saudi-outdoor' && timeOfDay === 'night' && profile.kind === 'storefront-spill') score += 35;

  return score;
};

const dynamicReason = (profile: LightingProfile, input: LightingSceneInput): string => {
  const { sceneFamily, subScene, timeOfDay, activity = '' } = input;
  if (sceneFamily === 'car' && subScene.includes('داخل') && profile.kind === 'vehicle-day-through-glass') return 'الأدق داخل السيارة نهارًا: الضوء يدخل من الزجاج وتبقى المقصورة أغمق من الخارج.';
  if (sceneFamily === 'car' && subScene.includes('داخل') && profile.kind === 'street-through-glass') return 'الأدق داخل السيارة ليلًا: مصدر الضوء يبقى خارج المقصورة ويدخل عبر الزجاج.';
  if (subScene.includes('ممر') && profile.kind === 'corridor-practical') return 'المشهد ممر، لذلك تتابع المصابيح السقفية هو المصدر الأكثر منطقية.';
  if (subScene.includes('مواقف') && timeOfDay === 'night' && profile.kind === 'parking-lot-night') return 'المشهد موقف سيارات ليلي، لذا أعمدة الإنارة العلوية هي الاختيار الفيزيائي الأقوى.';
  if (subScene.includes('التلفاز') && profile.kind === 'tv-spill') return 'المشهد أمام التلفاز ليلًا، لذلك وهج الشاشة مصدر عملي طبيعي وقريب.';
  if ((activity.includes('الهاتف') || activity.includes('يستخدم الهاتف')) && profile.kind === 'phone-screen') return 'النشاط يعتمد على الهاتف ليلًا، لذلك الشاشة يمكن أن تصبح مصدرًا محليًا مقنعًا.';
  if ((subScene.includes('مقهى') || subScene.includes('تجاري')) && profile.kind === 'storefront-spill') return 'المشهد تجاري/مقهى، لذلك ضوء الواجهة يفسر الإضاءة من داخل الكادر نفسه.';
  return profile.recommendationReasonAR;
};

export const getSmartLightingSuggestions = (input: LightingSceneInput, limit = 5): LightingSuggestion[] =>
  getSceneLightingProfiles(input.sceneFamily, input.subScene)
    .filter(profile => profile.compatibleTimes.includes(input.timeOfDay))
    .map(profile => ({
      labelAR: profile.labelAR,
      profile,
      score: timePreference(profile, input.timeOfDay) + scenePreference(profile, input),
      reasonAR: dynamicReason(profile, input)
    }))
    .sort((a, b) => b.score - a.score || a.labelAR.localeCompare(b.labelAR, 'ar'))
    .slice(0, Math.max(1, limit));

export const getCompatibleLightingSuggestions = (input: LightingSceneInput): LightingSuggestion[] =>
  getSmartLightingSuggestions(input, Number.MAX_SAFE_INTEGER);

export const getSmartDayTime = (sceneFamily: SceneFamilyId, subScene: string): EngineTimeOfDay => {
  if (sceneFamily === 'bedroom' || (sceneFamily === 'living-room' && subScene.includes('النافذة'))) return 'morning';
  if (sceneFamily === 'saudi-outdoor') return subScene.includes('موقف') ? 'midday' : 'afternoon';
  if (sceneFamily === 'car' && subScene.includes('داخل')) return 'afternoon';
  if (sceneFamily === 'military-base' && subScene.includes('مواقف')) return 'midday';
  return 'midday';
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

  // Phone-screen-only is a dark-scene ambient model. Capture flash, if separately enabled,
  // remains a camera event and does not activate any other practical source.
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
