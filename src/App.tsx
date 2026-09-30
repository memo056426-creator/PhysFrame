import React, { useState, useEffect, useRef } from 'react';

// --- TYPES ---
type CaptureType = 'front-selfie' | 'mirror-selfie' | 'third-person-candid';
type Framing = 'head-shoulders' | 'chest-up' | 'half-body';
type CameraAngle = 'eye-level' | 'slightly-high' | 'slightly-low' | 'slightly-off-center';
type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';
type RealismStyle = 'raw-candid' | 'cinematic-realism' | 'anti-ai-raw';
type SceneFamilyId = 'bedroom' | 'living-room' | 'saudi-outdoor' | 'gym' | 'car' | 'military-base';

type LensCondition = 'modern-iphone' | 'budget-android' | 'smudged-lens';
type ClothingCondition = 'crisp' | 'worn-all-day' | 'vintage-washed';
type AtmosphericCondition = 'neutral' | 'high-humidity' | 'dusty-haze' | 'breezy';
type ForegroundObstruction = 'clean' | 'through-glass' | 'foreground-clutter';

type GazeDirection = 'at-camera' | 'looking-away' | 'looking-down' | 'looking-out-window';
type HandProp = 'none' | 'phone' | 'car-keys' | 'coffee-cup' | 'adjusting-glasses' | 'vape-cigarette';
type FacialHairState = 'clean-shaven' | '3-day-stubble' | 'full-beard-neat' | 'full-beard-unkempt';
type FlashMode = 'no-flash' | 'direct-flash' | 'ambient-only';
type BackgroundDynamics = 'empty-still' | 'casual-indifferent' | 'busy-motion';

interface SceneState {
  referenceImageId: string | null;
  sceneFamily: SceneFamilyId | null;
  subScene: string;
  activity: string;
  captureType: CaptureType;
  framing: Framing;
  cameraAngle: CameraAngle;
  pose: string;
  outfitId: string;
  hairStyle: string;
  expression: string;
  timeOfDay: TimeOfDay;
  lightingMode: string;
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
}

interface DerivedSceneState {
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
}

interface SemanticScene {
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
}

// --- STORAGE HELPERS ---
const DB_NAME = 'PhysFrameDB';
const STORE_NAME = 'images';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveImageToDB = async (blob: Blob) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, 'reference');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadImageFromDB = async (): Promise<Blob | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get('reference');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const deleteImageFromDB = async () => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('reference');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

interface SavedPreset { id: string; name: string; state: SceneState; }

// --- DATA DICTIONARIES ---
const IDENTITY_LOCK = `Preserve exact facial identity from the reference image. 193cm height, 83kg weight, tall lean-athletic male build. Dark rectangular eyeglasses visible in reference MUST be worn. DO NOT alter facial proportions, head geometry, hairline, or natural hair density. DO NOT artificially beautify, de-age, or smooth skin. Preserve natural facial asymmetry and existing beard/moustache growth pattern.`;

const OUTFITS = [
  { id: 'mil1', labelAR: 'بدلة عسكرية مموهة (صحراوي)', category: ['military-base', 'saudi-outdoor', 'car'], prompt: 'Saudi desert camouflage military tactical uniform', physics: ['stiff thick tactical fabric', 'structured shoulder epaulets', 'velcro patches texture', 'heavy duty button tension', 'crisp collar'] },
  { id: 'mil2', labelAR: 'بدلة عسكرية مموهة (زيتي/أخضر)', category: ['military-base', 'saudi-outdoor', 'car'], prompt: 'Saudi woodland green camouflage military tactical uniform', physics: ['stiff thick fabric', 'structured shoulder epaulets', 'military insignia patches', 'heavy duty button tension'] },
  { id: 'mil3', labelAR: 'قميص عسكري إداري (مكتبي)', category: ['military-base', 'car'], prompt: 'Saudi administrative military uniform shirt (tan/khaki) with epaulets', physics: ['crisp starched fabric', 'structured rigid collar', 'chest pocket details holding shape', 'formal tailored fit across chest'] },
  { id: 'thobe1', labelAR: 'ثوب أبيض صيفي خفيف', category: ['saudi-outdoor', 'car', 'living-room'], prompt: 'traditional white Saudi thobe', physics: ['lightweight vertical drape', 'smooth fabric flow', 'subtle natural micro-creases', 'crisp collar tension'] },
  { id: 'thobe2', labelAR: 'ثوب شتوي كحلي ثقيل', category: ['saudi-outdoor', 'car', 'living-room'], prompt: 'traditional winter dark navy Saudi thobe', physics: ['heavy wool-blend drape', 'thick structural folds', 'minimal wind movement', 'matte light absorption'] },
  { id: 'thobe3', labelAR: 'ثوب رمادي داكن', category: ['saudi-outdoor', 'car', 'living-room'], prompt: 'dark grey traditional Saudi thobe', physics: ['medium weight drape', 'subtle fabric sheen', 'sharp shoulder structure'] },
  { id: 'thobe4', labelAR: 'ثوب أبيض مع سديري أسود', category: ['saudi-outdoor', 'car'], prompt: 'traditional white Saudi thobe worn with a structured black vest (sudairy)', physics: ['layered fabric intersection', 'structured vest over flowing thobe', 'contrasting fabric textures'] },
  { id: 'thobe6', labelAR: 'ثوب أبيض مع شماغ أحمر', category: ['saudi-outdoor', 'car', 'living-room'], prompt: 'traditional white Saudi thobe worn with a red and white checkered shemagh headpiece', physics: ['head fabric drape', 'shemagh resting on shoulders', 'fabric framing the face'] },
  { id: 'cas1', labelAR: 'قميص كتان بيج مع بنطلون سكري', category: ['saudi-outdoor', 'living-room', 'car'], prompt: 'beige linen shirt and off-white trousers', physics: ['breathable linen texture', 'irregular natural wrinkles', 'relaxed shoulder fit'] },
  { id: 'cas6', labelAR: 'هودي أوفرسايز أسود مع كارقو بانتس', category: ['saudi-outdoor', 'car', 'gym'], prompt: 'black oversized hoodie and cargo pants', physics: ['heavy cotton gathering', 'thick hood resting on neck', 'heavy gravity response'] },
  { id: 'cas8', labelAR: 'قميص مفتوح فوق تيشيرت أبيض', category: ['saudi-outdoor', 'car', 'living-room', 'bedroom'], prompt: 'unbuttoned casual open shirt over a white t-shirt', physics: ['layered fabric interaction', 'inner t-shirt body contact'] },
  { id: 'cas13', labelAR: 'جاكيت جلد أسود مع تيشيرت رمادي', category: ['saudi-outdoor', 'car'], prompt: 'black leather jacket over a grey t-shirt', physics: ['stiff leather creases', 'specular highlights on leather surface', 'structured shoulders'] },
  { id: 'gym1', labelAR: 'تيشيرت رياضي ضيق أسود مع شورت رمادي', category: ['gym'], prompt: 'black compression athletic t-shirt and grey workout shorts', physics: ['stretchy synthetic fabric', 'muscle-contouring fit', 'tension lines around chest and arms'] },
  { id: 'gym3', labelAR: 'طقم رياضي بسحاب رمادي غامق', category: ['gym', 'saudi-outdoor'], prompt: 'dark grey athletic tracksuit with zipper', physics: ['windbreaker material', 'zipper tension', 'athletic gathering at joints'] },
  { id: 'bed1', labelAR: 'تيشيرت رمادي مريح مع شورت أسود', category: ['bedroom', 'living-room'], prompt: 'comfortable loose grey t-shirt and black cotton shorts', physics: ['soft relaxed fabric drape', 'natural gravity folds'] },
  { id: 'bed3', labelAR: 'طقم بيجامة قطنية كحلية', category: ['bedroom', 'living-room'], prompt: 'navy blue cotton lounge pajama set', physics: ['very soft drape', 'smooth wrinkle-free fall'] }
];

const SCENE_FAMILIES = {
  'military-base': { labelAR: 'مبنى عمل عسكري', subScenes: ['مكتب إداري عسكري', 'ممرات المبنى', 'أمام لوحة شعار القطاع', 'مواقف سيارات القطاع'], activities: ['عمل مكتبي', 'استراحة قصيرة', 'مناوبة', 'واقف بثبات واعتزاز'], poses: ['واقف باستقامة', 'جالس خلف المكتب', 'مستند بظهره على مكتب', 'واقف بثبات'], allowedLighting: ['إضاءة مكتب فلورسنت', 'ضوء نهاري من النافذة', 'إضاءة ممرات متوازية', 'شمس الظهر'], environmentRealism: ['رسمية ومنظمة', 'نشطة (عمل يومي)'] },
  'saudi-outdoor': { labelAR: 'أماكن سعودية', subScenes: ['شارع فلل سكني', 'حي سكني حديث', 'شارع تجاري محلي', 'أمام مقهى', 'موقف سيارات', 'حديقة حي عامة', 'ممشى رياضي'], activities: ['يمشي بهدوء', 'واقف بشكل طبيعي', 'ينتظر', 'جالس في المقهى'], poses: ['واقف بثبات', 'يمشي بخطوات طبيعية', 'مستند على جدار', 'مستند بظهره على الجدار', 'جالس على كرسي'], allowedLighting: ['ضوء نهاري طبيعي', 'شمس الظهر', 'ساعة ذهبية (شروق/غروب)', 'إنارة شارع دافئة', 'إنارة نيون تجارية متناثرة'], environmentRealism: ['هادئ', 'طبيعي', 'نشط'] },
  'car': { labelAR: 'السيارة', subScenes: ['داخل السيارة', 'بجانب السيارة متوقفة'], activities: ['خلف المقود والسيارة متوقفة', 'جالس في مقعد الراكب', 'جالس بهدوء داخل السيارة'], poses: ['جالس باسترخاء في المقعد', 'مستند على المقود'], allowedLighting: ['ضوء نهاري طبيعي', 'شمس الظهر', 'إضاءة داخل السيارة', 'إضاءة الشارع عبر زجاج السيارة', 'إضاءة شاشة الهاتف فقط'], environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا'] },
  'living-room': { labelAR: 'صالة منزلية', subScenes: ['في منتصف الصالة', 'بجانب النافذة', 'أمام التلفاز'], activities: ['جالس على الكنبة', 'واقف بشكل طبيعي', 'يشرب قهوة', 'يستخدم الهاتف'], poses: ['مسترخٍ على الكنبة', 'واقف بثبات', 'مستند على طاولة'], allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة سقف', 'إنارة ليلية مختلطة', 'إضاءة شاشة الهاتف فقط'], environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا'] },
  'bedroom': { labelAR: 'غرفة نوم', subScenes: ['بجانب السرير', 'على حافة السرير', 'أمام الدولاب', 'مع اللابتوب'], activities: ['جالس', 'واقف بشكل طبيعي', 'مسترخٍ', 'يستخدم الهاتف'], poses: ['جالس على حافة السرير', 'نصف مستلقٍ', 'مستند على الجدار', 'واقف بثبات'], allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة سقف', 'إضاءة أباجورة دافئة', 'إضاءة شاشة الهاتف فقط'], environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا'] },
  'gym': { labelAR: 'نادي رياضي', subScenes: ['بجانب الأثقال', 'أمام المرآة', 'في منطقة الأجهزة'], activities: ['قبل التمرين', 'يستريح بين الجولات', 'بعد التمرين'], poses: ['واقف بجانب الأجهزة', 'جالس على مقعد التمرين', 'يحمل زجاجة ماء'], allowedLighting: ['إضاءة النادي الرياضي', 'ضوء نهاري طبيعي'], environmentRealism: ['هادئ', 'طبيعي', 'نشط'] }
};

const HAIRSTYLES = [
  { id: 'h1', labelAR: 'طبيعي', prompt: 'natural everyday hair', physics: 'maintains original natural density and texture' },
  { id: 'h2', labelAR: 'مرتب للخلف', prompt: 'neatly styled back hair', physics: 'styled but retaining natural hairline and volume' },
  { id: 'h3', labelAR: 'جانبي مرتب', prompt: 'neatly parted to the side hair', physics: 'clean part, natural resting volume' },
  { id: 'h4', labelAR: 'فوضوي خفيف', prompt: 'slightly messy casual hair', physics: 'natural unstyled resting state' },
  { id: 'h5', labelAR: 'بعد التمرين (مبلل قليلًا)', prompt: 'slightly sweat-dampened post-workout hair', physics: 'clumping slightly from mild moisture, retaining natural base density' },
  { id: 'h6', labelAR: 'عسكري (قصير جداً ومحدد)', prompt: 'very short neat military regulation haircut', physics: 'tight fade on sides, minimal volume on top, sharp natural hairline' }
];

const EXPRESSIONS = [
  { id: 'e1', labelAR: 'محايد', prompt: 'neutral resting expression' },
  { id: 'e2', labelAR: 'هادئ', prompt: 'calm relaxed expression' },
  { id: 'e3', labelAR: 'ابتسامة خفيفة مغلقة', prompt: 'subtle closed-mouth smile' },
  { id: 'e4', labelAR: 'مركز', prompt: 'focused expression' },
  { id: 'e5', labelAR: 'حازم (رسمي)', prompt: 'firm serious professional expression' }
];

const GAZE_DIRECTIONS = [
  { id: 'at-camera', labelAR: 'ينظر للعدسة', prompt: 'looking directly at camera lens' },
  { id: 'looking-away', labelAR: 'ينظر بعيداً', prompt: 'looking away from camera, candid moment' },
  { id: 'looking-down', labelAR: 'ينظر للأسفل', prompt: 'looking down at phone or object in hands' },
  { id: 'looking-out-window', labelAR: 'ينظر خارج النافذة', prompt: 'gazing out window, thoughtful expression' }
];

const HAND_PROPS = [
  { id: 'none', labelAR: 'لا شيء', prompt: 'empty hands or naturally resting' },
  { id: 'phone', labelAR: 'يمسك هاتف', prompt: 'holding smartphone in one hand, screen visible' },
  { id: 'car-keys', labelAR: 'مفاتيح سيارة', prompt: 'holding car keys in hand, key fob visible' },
  { id: 'coffee-cup', labelAR: 'كوب قهوة', prompt: 'holding coffee cup, steam rising slightly' },
  { id: 'adjusting-glasses', labelAR: 'يعدل النظارة', prompt: 'hand adjusting eyeglasses frame' },
  { id: 'vape-cigarette', labelAR: 'فيب/سيجارة', prompt: 'holding vape or cigarette between fingers' }
];

const FACIAL_HAIR_STATES = [
  { id: 'clean-shaven', labelAR: 'حلاقة نظيفة', prompt: 'clean shaven face, smooth jawline' },
  { id: '3-day-stubble', labelAR: 'لحية 3 أيام', prompt: '3-day stubble, visible coarse hair on jaw and cheeks' },
  { id: 'full-beard-neat', labelAR: 'لحية كاملة مرتبة', prompt: 'full neat beard, well-groomed' },
  { id: 'full-beard-unkempt', labelAR: 'لحية غير مهذبة', prompt: 'full unkempt beard, natural growth pattern, slightly messy' }
];

const FLASH_MODES = [
  { id: 'no-flash', labelAR: 'بدون فلاش', prompt: 'no flash, natural ambient lighting only' },
  { id: 'direct-flash', labelAR: 'فلاش مباشر', prompt: 'direct smartphone flash, harsh frontal lighting' },
  { id: 'ambient-only', labelAR: 'إضاءة محيطة فقط', prompt: 'ambient lighting only, no artificial flash' }
];

interface VibePreset { id: string; labelAR: string; icon: string; state: Partial<SceneState>; }

const VIBE_PRESETS: VibePreset[] = [
  { id: 'night-drive', labelAR: 'قيادة ليلية هادئة', icon: '🌙', state: { sceneFamily: 'car', subScene: 'داخل السيارة', activity: 'خلف المقود والسيارة متوقفة', pose: 'جالس باسترخاء في المقعد', timeOfDay: 'night', lightingMode: 'إضاءة الشارع عبر زجاج السيارة', captureType: 'front-selfie', gazeDirection: 'looking-down', handProp: 'phone', flashMode: 'ambient-only', foregroundObstruction: 'through-glass' } },
  { id: 'friday-morning', labelAR: 'صباح جمعة كاجوال', icon: '☕', state: { sceneFamily: 'living-room', subScene: 'بجانب النافذة', activity: 'يشرب قهوة', pose: 'مسترخٍ على الكنبة', timeOfDay: 'morning', lightingMode: 'ضوء نهاري طبيعي', captureType: 'third-person-candid', gazeDirection: 'looking-away', handProp: 'coffee-cup', flashMode: 'no-flash', outfitId: 'cas1' } },
  { id: 'post-workout', labelAR: 'بعد التمرين مباشرة', icon: '🏋️', state: { sceneFamily: 'gym', subScene: 'أمام المرآة', activity: 'بعد التمرين', pose: 'واقف بجانب الأجهزة', timeOfDay: 'midday', lightingMode: 'إضاءة النادي الرياضي', captureType: 'mirror-selfie', gazeDirection: 'at-camera', handProp: 'none', flashMode: 'no-flash', outfitId: 'gym1', hairStyle: 'h5', atmosphericCondition: 'high-humidity' } },
  { id: 'military-duty', labelAR: 'مناوبة عسكرية', icon: '🎖️', state: { sceneFamily: 'military-base', subScene: 'مكتب إداري عسكري', activity: 'عمل مكتبي', pose: 'جالس خلف المكتب', timeOfDay: 'midday', lightingMode: 'إضاءة مكتب فلورسنت', captureType: 'third-person-candid', gazeDirection: 'at-camera', handProp: 'none', flashMode: 'no-flash', outfitId: 'mil3', facialHairState: 'clean-shaven' } }
];

// --- BACKGROUND CROWD DYNAMICS ---
const resolveBackgroundDynamics = (state: SceneState): { description: string; constraints: string[] } => {
  const mode = state.backgroundDynamics ?? 'empty-still';
  if (mode === 'empty-still') {
    return {
      description: 'Calm background with no prominent background people; ordinary environment details and subtle traces of daily life only.',
      constraints: []
    };
  }

  const constraints = [
    'NO background people staring at the camera',
    'NO posed background characters',
    'NO generic stock-photo crowd',
    'NO duplicated people or cloned faces',
    'NO perfectly sharp background faces competing with the main subject'
  ];
  const busy = mode === 'busy-motion';

  if (state.sceneFamily === 'saudi-outdoor') {
    return {
      description: busy
        ? 'Plausibly active pedestrian flow in the background: indifferent passersby minding their own business, some partially occluded and walking away, one distant person may glance down at a phone, with mild motion blur only on genuinely moving figures. No background person engages with the camera.'
        : 'A few indifferent pedestrians in the background minding their own business; one distant person may be looking down at a phone and another partially obscured figure may be walking away. Background people remain naturally small or slightly soft from distance, with zero eye contact toward the camera.',
      constraints
    };
  }

  if (state.sceneFamily === 'military-base') {
    const parking = state.subScene.includes('مواقف');
    return {
      description: busy
        ? (parking
          ? 'Active but believable workplace parking background with uniformed personnel moving between vehicles, some carrying paperwork or small work items, with mild motion blur on brisk movement and casual unposed body language.'
          : 'Candid workplace activity with several uniformed colleagues walking briskly through the corridor or office background, some carrying paperwork, varied unposed stances, and mild motion blur on moving personnel.')
        : (parking
          ? 'One or two uniformed colleagues moving naturally in the parking background, occupied with work or vehicles and not acknowledging the camera.'
          : 'One or two uniformed colleagues in the background continuing ordinary work, walking or handling paperwork in casual unposed stances, without looking at the camera.'),
      constraints
    };
  }

  if (state.sceneFamily === 'gym') {
    return {
      description: busy
        ? 'Multiple gym members at different stages of exercise in the background, with natural overlap between bodies and equipment, one person resting or wiping sweat, and mild motion blur on actively moving limbs. Nobody pauses or poses for the camera.'
        : 'A few gym members naturally mid-workout or resting in the background; one distant person may be wiping sweat or adjusting equipment. Equipment partially occludes bodies in a physically plausible way and nobody looks at the camera.',
      constraints
    };
  }

  if (state.sceneFamily === 'car') {
    const insideCar = state.subScene.includes('داخل');
    return {
      description: insideCar
        ? (busy
          ? 'Passing pedestrians and traffic remain outside the vehicle windows, with physically plausible motion blur from movement and faint reflections on the glass; background figures never appear inside the cabin or acknowledge the camera.'
          : 'An occasional distant pedestrian or passing vehicle may be visible outside the windows, softened by distance and glass, with faint traffic reflections on the window surface and no eye contact toward the camera.')
        : (busy
          ? 'Active but ordinary roadside background with passing pedestrians and traffic, partial occlusion by the parked car, and mild motion blur on moving figures; nobody interacts with the camera.'
          : 'A few indifferent pedestrians or distant road users pass behind the parked car, minding their own business and never looking toward the camera.'),
      constraints
    };
  }

  if (state.sceneFamily === 'living-room') {
    return {
      description: busy
        ? 'Domestic background remains believable rather than crowded: one partially visible household member may cross or occupy an adjacent area, naturally soft or slightly motion-blurred and not facing the camera, with lived-in traces such as a casually placed jacket, cup, cable, or remote.'
        : 'Subtle traces of daily life in the background, such as a casually placed jacket, cup, cable, or remote; if the layout allows, a partially visible household member may appear deep in an adjacent area without looking toward the camera.',
      constraints
    };
  }

  if (state.sceneFamily === 'bedroom') {
    return {
      description: busy
        ? 'Keep the bedroom private and uncrowded: at most one partially visible household member may pass through a doorway or adjacent space if physically visible, never posing or looking at the camera; otherwise use stronger lived-in traces such as a casually discarded jacket, charging cable, book, or folded clothing.'
        : 'No crowd in the bedroom. Prefer believable traces of daily life such as a casually discarded jacket on a chair, charging cable, book, or folded clothing rather than adding unnecessary people.',
      constraints
    };
  }

  return {
    description: busy
      ? 'Background activity should feel naturally busy with unposed people moving independently of the camera and mild motion blur only where movement physically justifies it.'
      : 'A small number of background people may appear incidentally, remaining unposed, occupied with their own activity, and never looking at the camera.',
    constraints
  };
};

// --- RULES ENGINE & RESOLVERS ---
const resolveConflicts = (state: SceneState): SceneState => {
  let newState = { ...state };
  if (!newState.sceneFamily) return newState;

  const family = SCENE_FAMILIES[newState.sceneFamily];
  const availableLighting = family.allowedLighting;

  if (newState.lightingMode === 'إضاءة شاشة الهاتف فقط') newState.timeOfDay = 'night';

  if (newState.captureType === 'mirror-selfie') {
    const allowedMirrorFamilies = ['bedroom', 'gym', 'living-room'];
    if (!allowedMirrorFamilies.includes(newState.sceneFamily)) newState.captureType = 'front-selfie';
  }

  const isOutdoor = newState.sceneFamily === 'saudi-outdoor' || 
                    (newState.sceneFamily === 'military-base' && newState.subScene.includes('مواقف')) ||
                    (newState.sceneFamily === 'car' && newState.subScene.includes('بجانب'));
  const isIndoor = !isOutdoor;

  if (isIndoor && (newState.atmosphericCondition === 'breezy' || newState.atmosphericCondition === 'dusty-haze')) {
    newState.atmosphericCondition = 'neutral';
  }

  const isNight = newState.timeOfDay === 'night';
  const isDay = ['morning', 'midday', 'afternoon'].includes(newState.timeOfDay);

  if (isNight && (newState.lightingMode.includes('نهار') || newState.lightingMode.includes('شمس'))) {
     newState.lightingMode = availableLighting.find(l => l.includes('ليل') || l.includes('أباجورة') || l.includes('شاشة') || l.includes('فلورسنت') || l.includes('شارع')) || availableLighting[0];
  }
  if (isDay && (newState.lightingMode.includes('ليل') || newState.lightingMode === 'إضاءة شاشة الهاتف فقط')) {
     newState.lightingMode = availableLighting.find(l => l.includes('نهار') || l.includes('شمس') || l.includes('فلورسنت')) || availableLighting[0];
  }
  
  if (isOutdoor && newState.lightingMode.match(/مكتب|سقف|أباجورة/)) {
     newState.lightingMode = availableLighting.find(l => l.match(/نهار|شمس|شارع/)) || availableLighting[0];
  }
  if (isIndoor && newState.lightingMode.match(/شمس|شارع/)) {
     newState.lightingMode = availableLighting.find(l => l.match(/مكتب|سقف|أباجورة|فلورسنت|شاشة/)) || availableLighting[0];
  }

  if (newState.sceneFamily === 'gym' && newState.activity === 'بعد التمرين' && !newState.hairStyle.includes('تمرين')) {
    newState.hairStyle = 'h5'; 
  }
  
  if (newState.sceneFamily === 'car' && newState.captureType === 'third-person-candid' && newState.subScene === 'داخل السيارة' && newState.foregroundObstruction === 'clean') {
      newState.foregroundObstruction = 'through-glass';
  }

  if (isDay && newState.flashMode === 'direct-flash') newState.flashMode = 'no-flash';

  return newState;
};

const deriveRealismState = (state: SceneState): DerivedSceneState => {
  const derived: DerivedSceneState = {
    skinResponse: 'untouched real human skin chemistry, microscopically visible vellus hair (peach fuzz), uneven natural melanin distribution',
    hairCondition: 'maintains natural original density, individual stray hairs visible, no helmet-like perfect styling',
    fabricBehavior: [],
    shadowBehavior: 'physically plausible contact shadows',
    environmentalLightBehavior: 'natural indirect bounce light',
    cameraDistance: 'arm-length distance (approx 40-60cm)',
    visibleBackgroundElements: [],
    contactPhysics: [],
    reflectionRules: [],
    realismConstraints: ['MUST LOOK LIKE AN UNEDITED SMARTPHONE SNAPSHOT', 'NO PROFESSIONAL STUDIO LIGHTING', 'NO CGI OR 3D RENDER AESTHETICS'],
    lensEffects: 'standard smartphone computational photography',
    handPropDetails: '',
    facialHairDetails: '',
    flashEffects: ''
  };

  // --- 1. Base Realism Injections (Skin & Shadows Physics) ---
  derived.skinResponse += ', subtle subsurface scattering visible on ears and nose tip, micro-specular highlights on forehead and nose bridge from natural skin oils';
  derived.shadowBehavior += ', deep ambient occlusion in clothing folds and under jawline, hard physically accurate contact shadow grounding the subject';

  // --- 2. Flash Mode Logic (The ultimate AI-breaker) ---
  if (state.flashMode === 'direct-flash') {
    derived.flashEffects = 'Harsh, direct on-axis smartphone flash. Creates a hard, sharp rim shadow directly behind the subject head on the wall/seat. Slight overexposure (blown highlights) on the center of the face, with rapid falloff to crushed blacks in the background. Minor lens flare or oily smudge glow around the flash reflection.';
    derived.shadowBehavior = 'Hard sharp shadows radiating directly behind subject, no ambient fill light, deep ambient occlusion';
    derived.skinResponse += ', strong specular highlight from flash on skin surface, visible pores emphasized by direct light';
    derived.lensEffects += ', slight overexposure on face center, crushed blacks in deep shadow areas with mild digital noise';
  } 
  // --- 3. Time of Day & Scene Specific Lighting ---
  else if (state.timeOfDay === 'night' || state.lightingMode.includes('شاشة') || state.lightingMode.includes('أباجورة') || state.lightingMode.includes('ليل')) {
    derived.environmentalLightBehavior = 'Rapid light falloff: the subject is illuminated, but the background falls into deep, natural shadow. Mixed color temperatures from practical sources.';
    derived.shadowBehavior = 'Asymmetrical lighting, hard shadow cast on the wall behind, deep ambient occlusion. No magical fill light illuminating the dark side of the face.';
    derived.lensEffects += ', visible grain/noise (simulating ISO 800-1600) in dark areas, no artificial denoising, mild chromatic aberration on high-contrast edges';
    
    if (state.sceneFamily === 'car') {
      derived.environmentalLightBehavior += ' Illuminated primarily by cool, faint glow of modern dashboard ambient lighting strip and distant streetlights.';
      derived.skinResponse += ', subtle realistic colored reflection from dashboard lights on the lower face and eyeglasses';
    } else if (state.lightingMode.includes('أباجورة') || state.lightingMode.includes('إنارة ليلية') || state.lightingMode.includes('مختلطة')) {
      derived.environmentalLightBehavior += ' Single warm practical light source from one side creating chiaroscuro effect. Lit side shows warm color temperature, shadow side has slight cool ambient tint.';
    }
  } 
  else if (state.timeOfDay === 'midday' && (state.sceneFamily === 'saudi-outdoor' || state.sceneFamily === 'military-base' || state.sceneFamily === 'car')) {
    derived.environmentalLightBehavior = 'Harsh, direct midday sunlight. High contrast. Slightly blown-out highlights on bright surfaces (like white thobe or car dashboard) due to limited smartphone dynamic range.';
    derived.shadowBehavior = 'Strong, sharp, short shadows directly beneath nose, chin, and eyeglasses frames. Deep ambient occlusion under headwear or hair.';
    derived.skinResponse += ', slight natural sheen/sweat on forehead catching harsh light';
    derived.lensEffects += ', camera struggling with extreme dynamic range, slight purple/green fringing on high-contrast edges';
  }
  else if (state.timeOfDay === 'sunset' || state.timeOfDay === 'afternoon') {
    derived.environmentalLightBehavior = 'Warm, directional golden hour light. Mixed color temperatures: warm sunlight contrasting with cool ambient sky fill.';
    derived.shadowBehavior = 'Soft but defined shadows, long cast shadows, deep ambient occlusion in fabric folds.';
    derived.skinResponse += ', warm rim light on hair and shoulders, subsurface scattering glowing on ears';
  }
  else {
    derived.environmentalLightBehavior = 'Natural indirect bounce light. Mixed color temperatures: cool natural daylight from window contrasting with warm, dim practical indoor lighting.';
    derived.shadowBehavior = 'Multiple faint, overlapping shadows cast by practical light sources, deep ambient occlusion in clothing folds.';
  }

  // --- 4. Sensor Limitations (Anti-AI Raw) ---
  if (state.realismStyle === 'anti-ai-raw') {
    derived.lensEffects += ', slight chromatic aberration (purple/green fringing) on high-contrast edges, microscopic sensor grain';
    derived.realismConstraints.push('NO impossible room-wide ambient fill light', 'NO perfectly white-balanced lighting, allow natural color casts', 'NO artificial denoising');
  }

  // --- 5. Camera & Lens Logic ---
  if (state.captureType === 'front-selfie') {
    derived.contactPhysics.push('one arm clearly extended holding the camera causing slight shoulder elevation and torso compensation');
    derived.lensEffects = 'smartphone front-camera aesthetic, 24mm equivalent focal length, slight natural barrel distortion at frame edges, handheld micro-shake. ' + derived.lensEffects;
    derived.cameraDistance = state.framing === 'head-shoulders' ? 'close arm-reach (approx 40cm)' : 'extended arm-reach (approx 65cm)';
  } else if (state.captureType === 'mirror-selfie') {
    derived.reflectionRules.push('geometrically accurate mirror reflection, smartphone clearly visible in hand, slight mirror glass imperfection or dust motes on surface');
    derived.lensEffects = 'smartphone main camera capturing a reflection, 26mm equivalent, natural focus on the mirror surface, slight depth falloff. ' + derived.lensEffects;
  } else {
    derived.cameraDistance = 'third-person candid distance (approx 1.5 - 3 meters)';
    derived.realismConstraints.push('candid framing without selfie-arm mechanics, natural depth of field');
    derived.lensEffects = 'smartphone main camera aesthetic, 35mm equivalent focal length, natural f/1.8 depth of field with gradual, non-artificial background blur. ' + derived.lensEffects;
  }

  // --- 6. Physics & Contact Logic ---
  if (state.pose.includes('جالس')) {
    derived.contactPhysics.push('natural weight distribution, clothing compressing realistically against the sitting surface, localized fabric bunching at hips and knees');
  } else if (state.pose.includes('مستند')) {
    derived.contactPhysics.push('clear physical contact point holding partial body weight, natural fabric tension and stretching at the contact area');
  }

  // --- 7. Background Details ---
  let baseDetails: string[] = [];
  if (state.sceneFamily === 'military-base') {
    baseDetails = ['official institutional document folders', 'neutral formal walls', 'subtle framed national emblem'];
    if (state.subScene.includes('مواقف')) baseDetails = ['realistic asphalt parking lot', 'parked official white SUVs', 'harsh daylight reflections'];
  } else if (state.sceneFamily === 'car') {
    baseDetails = ['premium dark leather seat texture', 'seatbelt edge', 'subtle modern dashboard ambient lighting strip', 'sleek interior trim'];
  } else if (state.sceneFamily === 'saudi-outdoor') {
    baseDetails = ['realistic pavement', 'neutral walls', 'parked vehicles', 'subtle heat haze'];
  } else if (state.sceneFamily === 'living-room' || state.sceneFamily === 'bedroom') {
    baseDetails = ['everyday household items slightly out of focus', 'natural lived-in environment details'];
  }

  if (state.framing === 'head-shoulders') derived.visibleBackgroundElements = baseDetails.slice(0, 2).map(d => `near-field: ${d}`);
  else derived.visibleBackgroundElements = baseDetails;

  // --- 8. Imperfections Injection ---
  if (state.lensCondition === 'budget-android') {
    derived.lensEffects = 'low-end smartphone processing, slight overall optical softness, blown-out highlights in bright areas, crushed blacks, inferior HDR recovery artifacts. ' + derived.lensEffects;
  } else if (state.lensCondition === 'smudged-lens') {
    derived.lensEffects = 'photographed through a slightly smudged lens, oily finger smudge causing organic light bloom and streaks, localized loss of micro-contrast around light sources. ' + derived.lensEffects;
  }

  if (state.clothingCondition === 'worn-all-day') {
    derived.fabricBehavior.push('irregular deep horizontal creases at joints (elbows, waist)', 'random unsymmetrical bunching', 'loss of crisp ironing, localized realistic wrinkles');
  } else if (state.clothingCondition === 'vintage-washed') {
    derived.fabricBehavior.push('faded fabric dye', 'slight wear and micro-fraying at collar and sleeve edges', 'soft worn-in matte texture');
  }

  // --- 9. Hand Prop Details ---
  if (state.handProp !== 'none') {
    const prop = HAND_PROPS.find(p => p.id === state.handProp);
    if (prop) {
      derived.handPropDetails = prop.prompt;
      if (state.handProp === 'phone') derived.contactPhysics.push('hand gripping phone naturally, thumb visible on screen edge');
      else if (state.handProp === 'car-keys') derived.contactPhysics.push('fingers wrapped around key fob, natural grip tension');
      else if (state.handProp === 'coffee-cup') derived.contactPhysics.push('hand wrapped around warm cup, fingers positioned naturally');
    }
  }

  // --- 10. Facial Hair Details ---
  const facialHair = FACIAL_HAIR_STATES.find(f => f.id === state.facialHairState);
  if (facialHair) {
    derived.facialHairDetails = facialHair.prompt;
    if (state.facialHairState === '3-day-stubble') derived.skinResponse += ', visible coarse stubble texture on jawline and cheeks, individual hair follicles catching light';
    else if (state.facialHairState === 'full-beard-unkempt') derived.skinResponse += ', natural beard growth with slight unevenness, stray hairs visible';
  }

  return derived;
};

const buildSemanticScene = (state: SceneState, derived: DerivedSceneState): SemanticScene => {
  const outfit = OUTFITS.find(o => o.id === state.outfitId);
  const hair = HAIRSTYLES.find(h => h.id === state.hairStyle);
  const expression = EXPRESSIONS.find(e => e.id === state.expression);
  const gaze = GAZE_DIRECTIONS.find(g => g.id === state.gazeDirection);
  const backgroundDynamics = resolveBackgroundDynamics(state);

  let captureMechanics = '';
  if (state.captureType === 'front-selfie') {
    captureMechanics = `Smartphone front-camera selfie. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Gaze: ${gaze?.prompt}. ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`;
  } else if (state.captureType === 'mirror-selfie') {
    captureMechanics = `Smartphone mirror selfie. Framing: ${state.framing}. Gaze: ${gaze?.prompt}. ${derived.reflectionRules.join('. ')}`;
  } else {
    captureMechanics = `Third-person candid photograph. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Gaze: ${gaze?.prompt}.`;
  }

  let cameraRealism = `Style: ${state.realismStyle.replace('-', ' ')}. ${derived.lensEffects}. ${derived.flashEffects} Avoid CGI glossy look.`;
  if (state.realismStyle === 'anti-ai-raw') {
     cameraRealism = `Style: Absolute raw hyper-realism. Unedited, unfiltered mobile capture. ${derived.lensEffects}. ${derived.flashEffects} Designed to mimic raw physical photography perfectly.`;
  }

  return {
    identity: IDENTITY_LOCK,
    body: '193cm, 83kg, tall lean-athletic male build.',
    captureMechanics,
    hair: `${hair?.prompt}. Physics: ${hair?.physics}. ${derived.hairCondition}.`,
    expression: expression?.prompt || 'neutral',
    outfit: outfit?.prompt || '',
    outfitPhysics: (outfit?.physics || []).join(', ') + '. ' + derived.fabricBehavior.join(', '),
    poseAndContact: `Pose: ${state.pose}. Activity: ${state.activity}. Contact rules: ${derived.contactPhysics.filter(p => !p.includes('arm')).join('. ')}`,
    visibleEnvironment: `Location: Ordinary realistic ${state.sceneFamily} in Saudi Arabia (if applicable). Visible elements: ${derived.visibleBackgroundElements.join(', ')}. No iconic landmarks. Environment state: ${state.environmentRealism}.`,
    lighting: `Time: ${state.timeOfDay}. Lighting source: ${state.lightingMode}. Behavior: ${derived.environmentalLightBehavior}. Shadows: ${derived.shadowBehavior}.`,
    skinResponse: derived.skinResponse,
    cameraRealism: cameraRealism,
    styleConstraints: [...derived.realismConstraints, ...backgroundDynamics.constraints].join('. '),
    handProp: derived.handPropDetails,
    facialHair: derived.facialHairDetails,
    flashDetails: derived.flashEffects,
    shadowBehavior: derived.shadowBehavior,
    backgroundDynamics: backgroundDynamics.description
  };
};

const buildPromptText = (semantic: SemanticScene, aiType: 'chatgpt' | 'gemini'): string => {
  const identityBlock = `SUBJECT: A 193cm tall, 83kg lean-athletic Saudi male. MUST preserve exact facial identity, natural facial asymmetry, and existing beard/moustache pattern from the reference image. Dark rectangular eyeglasses MUST be worn. DO NOT alter facial proportions or hairline. Facial hair: ${semantic.facialHair}.`;
  
  const sceneBlock = `SCENE & ACTION: ${semantic.visibleEnvironment}. Activity: ${semantic.poseAndContact}. Background dynamics: ${semantic.backgroundDynamics}.`;
  const attireBlock = `ATTIRE: ${semantic.outfit}. Fabric behavior: ${semantic.outfitPhysics}.`;
  const techBlock = `CAMERA & LIGHTING: ${semantic.captureMechanics}. Light behavior: ${semantic.lighting}. ${semantic.flashDetails} Lens effects: ${semantic.cameraRealism}.`;
  const textureBlock = `TEXTURE DETAILS: ${semantic.skinResponse}. Hair: ${semantic.hair}. Hand prop: ${semantic.handProp}.`;

  if (aiType === 'chatgpt') {
    return `CRITICAL INSTRUCTION: Generate a raw, unedited, authentic smartphone snapshot. STRICTLY FORBIDDEN: Do NOT apply any beautification, skin smoothing, airbrushing, or artistic filters. Do NOT make it look like a 3D render, CGI, stock photography, or professional studio portrait. It must look like a casual, imperfect photo taken by a real person.

${identityBlock}
${sceneBlock}
${attireBlock}
${techBlock}
${textureBlock}

PHYSICS & IMPERFECTIONS CONSTRAINTS:
- ${semantic.styleConstraints}
- Ensure natural weight distribution and fabric compression.
- Include subtle smartphone computational photography artifacts (mild noise, slight motion blur on extremities).
- NO perfect symmetry, NO waxy skin, NO floating objects, NO impossible lighting.`;
  } 
  
  if (aiType === 'gemini') {
    return `A highly realistic, raw smartphone photograph. Shot on a standard mobile device (approx 26mm-35mm equivalent focal length, f/1.8 aperture). 

The image features a 193cm tall, 83kg lean-athletic Saudi male wearing dark rectangular eyeglasses, preserving exact natural facial asymmetry, skin texture, and hairline from the reference. Facial hair: ${semantic.facialHair}. He is wearing: ${semantic.outfit}. The fabric shows realistic physical behavior: ${semantic.outfitPhysics}.

He is located in: ${semantic.visibleEnvironment}. His pose and activity: ${semantic.poseAndContact}. He is holding: ${semantic.handProp}. Background dynamics: ${semantic.backgroundDynamics}.

The lighting is characterized by: ${semantic.lighting}. ${semantic.flashDetails} This creates specific shadow behavior: ${semantic.shadowBehavior}. 

Crucial textural details: The skin exhibits ${semantic.skinResponse}. The hair shows ${semantic.hair}. The lens captures the scene with: ${semantic.cameraRealism}. 

The image must strictly adhere to these realism constraints: ${semantic.styleConstraints}. Avoid any CGI, 3D render aesthetics, studio lighting, or artificial smoothing. Embrace authentic, unedited photographic imperfections.`;
  }

  return "";
};

// --- MAIN REACT APPLICATION ---
const DEFAULT_STATE: SceneState = {
  referenceImageId: '1000236308.png', sceneFamily: null, subScene: '', activity: '', captureType: 'front-selfie', framing: 'chest-up', cameraAngle: 'eye-level', pose: '', outfitId: 'mil3', hairStyle: 'h2', expression: 'e1', timeOfDay: 'midday', lightingMode: '', environmentRealism: 'رسمية ومنظمة', realismStyle: 'anti-ai-raw', lensCondition: 'modern-iphone', clothingCondition: 'crisp', atmosphericCondition: 'neutral', foregroundObstruction: 'clean', gazeDirection: 'at-camera', handProp: 'none', facialHairState: '3-day-stubble', flashMode: 'no-flash', backgroundDynamics: 'empty-still'
};

export default function PhysFrameApp() {
  const [state, setState] = useState<SceneState>(DEFAULT_STATE);
  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'gemini'>('chatgpt');
  const [imageUrl, setImageUrl] = useState<string | null>('1000236308.png');
  const [hasReference, setHasReference] = useState<boolean>(true);
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [showPresetsSheet, setShowPresetsSheet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedState = localStorage.getItem('physframe_current_state');
        if (savedState) setState({ ...DEFAULT_STATE, ...JSON.parse(savedState) });
        const savedPresets = localStorage.getItem('physframe_presets');
        if (savedPresets) setPresets(JSON.parse(savedPresets));
        const blob = await loadImageFromDB();
        if (blob) { setImageUrl(URL.createObjectURL(blob)); setHasReference(true); }
      } catch (e) { console.error('Failed to load local data', e); }
      setIsLoaded(true);
    };
    loadInitialData();
  }, []);

  useEffect(() => { if (isLoaded) localStorage.setItem('physframe_current_state', JSON.stringify(state)); }, [state, isLoaded]);
  useEffect(() => { return () => { if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl); }; }, [imageUrl]);

  const activeFamily = state.sceneFamily ? SCENE_FAMILIES[state.sceneFamily] : null;
  const filteredOutfits = OUTFITS.filter(o => state.sceneFamily ? o.category.includes(state.sceneFamily) : true);

  useEffect(() => {
    if (state.sceneFamily) {
      const resolved = resolveConflicts(state);
      if (JSON.stringify(resolved) !== JSON.stringify(state)) setState(resolved);
    }
  }, [state.sceneFamily, state.lightingMode, state.timeOfDay, state.captureType, state.activity, state.foregroundObstruction, state.flashMode]);

  const handleSceneSelect = (familyId: SceneFamilyId) => {
    const family = SCENE_FAMILIES[familyId];
    setState({ ...state, sceneFamily: familyId, subScene: family.subScenes[0], activity: family.activities[0], pose: family.poses[0], lightingMode: family.allowedLighting[0], environmentRealism: family.environmentRealism[0], outfitId: OUTFITS.find(o => o.category.includes(familyId))?.id || 'cas1' });
  };

  const handleSmartComposition = () => {
    const families = Object.keys(SCENE_FAMILIES) as SceneFamilyId[];
    const randomFamilyId = families[Math.floor(Math.random() * families.length)];
    const family = SCENE_FAMILIES[randomFamilyId];
    const availableOutfits = OUTFITS.filter(o => o.category.includes(randomFamilyId));
    const lensOpts = Array(7).fill('modern-iphone').concat(['budget-android', 'budget-android', 'smudged-lens']);
    const randLens = lensOpts[Math.floor(Math.random() * lensOpts.length)] as LensCondition;
    const clothingOpts = Array(7).fill('crisp').concat(['worn-all-day', 'worn-all-day', 'vintage-washed']);
    const randClothing = clothingOpts[Math.floor(Math.random() * clothingOpts.length)] as ClothingCondition;
    const obstructionOpts = Array(7).fill('clean').concat(['through-glass', 'foreground-clutter', 'foreground-clutter']);
    const randObstruction = obstructionOpts[Math.floor(Math.random() * obstructionOpts.length)] as ForegroundObstruction;
    const atmosphericOpts = Array(7).fill('neutral').concat(['high-humidity', 'dusty-haze', 'breezy']);
    const randAtmospheric = atmosphericOpts[Math.floor(Math.random() * atmosphericOpts.length)] as AtmosphericCondition;
    const gazeOpts = ['at-camera', 'looking-away', 'looking-down', 'looking-out-window'];
    const randGaze = gazeOpts[Math.floor(Math.random() * gazeOpts.length)] as GazeDirection;
    const propOpts = Array(5).fill('none').concat(['phone', 'car-keys', 'coffee-cup', 'adjusting-glasses']);
    const randProp = propOpts[Math.floor(Math.random() * propOpts.length)] as HandProp;
    const facialHairOpts = ['clean-shaven', '3-day-stubble', 'full-beard-neat', 'full-beard-unkempt'];
    const randFacialHair = facialHairOpts[Math.floor(Math.random() * facialHairOpts.length)] as FacialHairState;
    const backgroundDynamicsOpts: BackgroundDynamics[] = ['empty-still', 'casual-indifferent', 'casual-indifferent'];
    if (['saudi-outdoor', 'military-base', 'gym', 'car'].includes(randomFamilyId)) backgroundDynamicsOpts.push('busy-motion');
    const randBackgroundDynamics = backgroundDynamicsOpts[Math.floor(Math.random() * backgroundDynamicsOpts.length)];
    
    let rawState: SceneState = { ...state, sceneFamily: randomFamilyId, subScene: family.subScenes[Math.floor(Math.random() * family.subScenes.length)], activity: family.activities[Math.floor(Math.random() * family.activities.length)], pose: family.poses[Math.floor(Math.random() * family.poses.length)], lightingMode: family.allowedLighting[Math.floor(Math.random() * family.allowedLighting.length)], environmentRealism: family.environmentRealism[Math.floor(Math.random() * family.environmentRealism.length)], outfitId: availableOutfits[Math.floor(Math.random() * availableOutfits.length)]?.id || availableOutfits[0]?.id || 'bed1', timeOfDay: ['morning', 'midday', 'afternoon', 'night'][Math.floor(Math.random() * 4)] as TimeOfDay, captureType: 'front-selfie', expression: 'e1', hairStyle: 'h1', lensCondition: randLens, clothingCondition: randClothing, atmosphericCondition: randAtmospheric, foregroundObstruction: randObstruction, realismStyle: 'anti-ai-raw', gazeDirection: randGaze, handProp: randProp, facialHairState: randFacialHair, flashMode: 'no-flash', backgroundDynamics: randBackgroundDynamics };
    setState(resolveConflicts(rawState));
  };

  const handleVibePreset = (preset: VibePreset) => setState({ ...state, ...preset.state });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await saveImageToDB(file);
      if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
      setImageUrl(URL.createObjectURL(file)); setHasReference(true);
    }
  };

  const handleImageDelete = async () => {
    await deleteImageFromDB();
    if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(null); setHasReference(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePreset = () => {
    if (!state.sceneFamily) return;
    const name = `${SCENE_FAMILIES[state.sceneFamily].labelAR} - ${state.timeOfDay === 'night' ? 'ليل' : 'نهار'}`;
    const newPreset: SavedPreset = { id: Date.now().toString(), name, state };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets); localStorage.setItem('physframe_presets', JSON.stringify(updatedPresets));
  };
  
  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated); localStorage.setItem('physframe_presets', JSON.stringify(updated));
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  let chatGPTPrompt = "", geminiPrompt = "";
  if (state.sceneFamily) {
    const derived = deriveRealismState(state);
    const semantic = buildSemanticScene(state, derived);
    chatGPTPrompt = buildPromptText(semantic, 'chatgpt');
    geminiPrompt = buildPromptText(semantic, 'gemini');
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans pb-24 selection:bg-[var(--accent)] selection:text-black">
      <style>{`
        :root { --bg-main: #111315; --bg-card: #181B1E; --bg-hover: #202428; --text-main: #F3EFE7; --text-muted: #A7A39A; --accent: #C6A875; --border: rgba(255, 255, 255, 0.08); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .focus-ring:focus { outline: none; box-shadow: 0 0 0 2px var(--accent); }
      `}</style>

      <div className="max-w-md mx-auto bg-[var(--bg-main)] min-h-screen relative shadow-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg-main)]/90 backdrop-blur z-20">
          <div>
            <h1 className="text-xl font-bold tracking-wide">PhysFrame</h1>
            <p className="text-xs text-[var(--text-muted)]">محرك البرومبت الواقعي</p>
          </div>
          <div className="flex gap-3">
             <button aria-label="القوالب المحفوظة" className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors" onClick={() => setShowPresetsSheet(true)}>القوالب</button>
             <button aria-label="إعادة ضبط الإعدادات" className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors" onClick={() => {setState(DEFAULT_STATE); localStorage.removeItem('physframe_current_state');}}>إعادة ضبط</button>
          </div>
        </header>

        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold mb-3 text-[var(--text-muted)]">الصورة المرجعية</h2>
          {!hasReference ? (
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 flex flex-col items-center justify-center border border-dashed border-[var(--border)] text-center animate-fade-in">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-[var(--text-muted)]">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
               </div>
               <p className="text-sm font-medium mb-1">لم يتم تحديد صورة مرجعية</p>
               <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 mt-2 bg-[var(--accent)] text-black text-sm font-medium rounded-lg focus-ring hover:bg-[#d6b783] transition-colors">رفع صورة</button>
               <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-2xl p-3 flex gap-4 items-center border border-[var(--border)] animate-fade-in">
              <div className="w-16 h-20 bg-[var(--bg-hover)] rounded-xl overflow-hidden relative shrink-0 flex items-center justify-center">
                 <span className="text-2xl absolute opacity-50">👤</span>
                 <img src={imageUrl || ''} alt="Reference" className="w-full h-full object-cover opacity-80 relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
              </div>
              <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="w-2 h-2 rounded-full bg-[#7CB68B]"></span>
                   <span className="text-sm font-medium">الهوية مثبتة</span>
                 </div>
                 <div className="flex gap-2 mt-2">
                   <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-white/70 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md transition-colors focus-ring">استبدال</button>
                   <button onClick={handleImageDelete} className="text-[11px] text-red-400/70 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400">حذف</button>
                   <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                 </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-2">
          {!state.sceneFamily ? (
             <div className="py-10 text-center animate-fade-in">
                <h2 className="text-xl font-bold mb-6">أين تريد التصوير؟</h2>
                <div className="flex flex-col gap-3">
                  {Object.entries(SCENE_FAMILIES).map(([id, family]) => (
                    <button key={id} onClick={() => handleSceneSelect(id as SceneFamilyId)} className="w-full py-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] text-lg hover:bg-[var(--bg-hover)] transition-colors focus-ring">
                      {family.labelAR}
                    </button>
                  ))}
                </div>
             </div>
          ) : (
             <div className="animate-fade-in space-y-8 pb-10">
                <section className="bg-gradient-to-r from-[var(--accent)]/10 to-transparent p-4 rounded-2xl border border-[var(--accent)]/20">
                  <h3 className="font-bold text-[var(--accent)] text-sm mb-3">⚡ أجواء سريعة</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {VIBE_PRESETS.map(preset => (
                      <button key={preset.id} onClick={() => handleVibePreset(preset)} className="py-3 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-xl text-sm border border-[var(--border)] transition-colors focus-ring text-right">
                        <span className="text-lg ml-2">{preset.icon}</span>{preset.labelAR}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-lg text-[var(--accent)]">{activeFamily?.labelAR}</h3>
                    <button onClick={() => setState({...state, sceneFamily: null})} className="text-xs text-[var(--text-muted)] underline decoration-white/20 underline-offset-4 focus-ring rounded p-1 hover:text-white transition-colors">تغيير المكان</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeFamily?.subScenes.map(sub => (
                       <button key={sub} onClick={() => setState({...state, subScene: sub})} className={`px-4 py-2 rounded-xl text-sm transition-colors border focus-ring ${state.subScene === sub ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}`}>
                         {sub}
                       </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="font-medium mb-3">النشاط والوضعية</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {activeFamily?.activities.map(act => (
                       <button key={act} onClick={() => setState({...state, activity: act})} className={`py-2 px-3 rounded-xl text-sm border text-center focus-ring transition-colors ${state.activity === act ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>
                         {act}
                       </button>
                    ))}
                  </div>
                  <select value={state.pose} onChange={e => setState({...state, pose: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm appearance-none focus-ring">
                    {activeFamily?.poses.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </section>

                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
                   <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">إعدادات الكاميرا والكادر</h3>
                   <div className="flex gap-2 mb-3">
                      {[{id:'front-selfie', l:'أمامية'}, {id:'mirror-selfie', l:'مرآة'}, {id:'third-person-candid', l:'عفوية'}].map(t => (
                        <button key={t.id} onClick={() => setState({...state, captureType: t.id as CaptureType})} className={`flex-1 py-2 rounded-lg text-xs border focus-ring transition-colors ${state.captureType === t.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)] font-medium' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
                      ))}
                   </div>
                   <div className="flex gap-2 mb-3">
                      {[{id:'head-shoulders', l:'الرأس والكتف'}, {id:'chest-up', l:'الصدر للأعلى'}, {id:'half-body', l:'نصف الجسم'}].map(t => (
                        <button key={t.id} onClick={() => setState({...state, framing: t.id as Framing})} className={`flex-1 py-2 rounded-lg text-[11px] border focus-ring transition-colors ${state.framing === t.id ? 'bg-white/10 border-white/20 text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
                      ))}
                   </div>
                   <select value={state.cameraAngle} onChange={e => setState({...state, cameraAngle: e.target.value as CameraAngle})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring">
                    <option value="eye-level">زاوية: مستوى العين</option>
                    <option value="slightly-high">زاوية: أعلى قليلًا</option>
                    <option value="slightly-low">زاوية: أسفل قليلًا</option>
                    <option value="slightly-off-center">زاوية: خارج المنتصف</option>
                  </select>
                </section>

                <section>
                   <div className="flex justify-between items-center mb-3">
                     <h3 className="font-medium">الملابس والشخصية</h3>
                     <span className="text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full border border-[var(--accent)]/20">متوافق مع {activeFamily?.labelAR}</span>
                   </div>
                   <select value={state.outfitId} onChange={e => setState({...state, outfitId: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm appearance-none focus-ring mb-3 text-white">
                     {filteredOutfits.map(o => <option key={o.id} value={o.id}>{o.labelAR}</option>)}
                   </select>
                   <div className="grid grid-cols-2 gap-3">
                     <select value={state.hairStyle} onChange={e => setState({...state, hairStyle: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                       {HAIRSTYLES.map(h => <option key={h.id} value={h.id}>{h.labelAR}</option>)}
                     </select>
                     <select value={state.expression} onChange={e => setState({...state, expression: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                       {EXPRESSIONS.map(e => <option key={e.id} value={e.id}>{e.labelAR}</option>)}
                     </select>
                   </div>
                </section>

                <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">
                   <div className="flex items-center gap-2 mb-4">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                     <h3 className="font-bold text-[var(--accent)] text-sm tracking-wide">تفاصيل واقعية متقدمة</h3>
                   </div>
                   <div className="space-y-3">
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">اتجاه النظر</label>
                       <select value={state.gazeDirection} onChange={e => setState({...state, gazeDirection: e.target.value as GazeDirection})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {GAZE_DIRECTIONS.map(g => <option key={g.id} value={g.id}>{g.labelAR}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">مقتنيات اليد</label>
                       <select value={state.handProp} onChange={e => setState({...state, handProp: e.target.value as HandProp})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {HAND_PROPS.map(p => <option key={p.id} value={p.id}>{p.labelAR}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة اللحية</label>
                       <select value={state.facialHairState} onChange={e => setState({...state, facialHairState: e.target.value as FacialHairState})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {FACIAL_HAIR_STATES.map(f => <option key={f.id} value={f.id}>{f.labelAR}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حركة الخلفية</label>
                       <select value={state.backgroundDynamics ?? 'empty-still'} onChange={e => setState({...state, backgroundDynamics: e.target.value as BackgroundDynamics})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="empty-still">هادئة / فارغة</option>
                         <option value="casual-indifferent">عابرون غير مبالين</option>
                         <option value="busy-motion">مزدحمة وحركية</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">وضع الفلاش (يكسر مظهر AI)</label>
                       <select value={state.flashMode} onChange={e => setState({...state, flashMode: e.target.value as FlashMode})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {FLASH_MODES.map(f => <option key={f.id} value={f.id}>{f.labelAR}</option>)}
                       </select>
                     </div>
                   </div>
                </section>

                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
                   <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">الوقت والإضاءة</h3>
                   <div className="flex flex-wrap gap-2 mb-4">
                      {[{id:'morning', l:'صباح'}, {id:'midday', l:'ظهر'}, {id:'afternoon', l:'عصر'}, {id:'sunset', l:'غروب'}, {id:'night', l:'ليل'}].map(t => (
                        <button key={t.id} onClick={() => setState({...state, timeOfDay: t.id as TimeOfDay})} className={`px-3 py-1.5 rounded-lg text-sm border focus-ring transition-colors ${state.timeOfDay === t.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
                      ))}
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {activeFamily?.allowedLighting.map(l => (
                        <button key={l} onClick={() => setState({...state, lightingMode: l})} className={`px-3 py-1.5 rounded-lg text-xs border focus-ring transition-colors ${state.lightingMode === l ? 'bg-white/10 border-white/20 text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{l}</button>
                      ))}
                   </div>
                </section>

                <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">
                   <div className="flex items-center gap-2 mb-4">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                     <h3 className="font-bold text-[var(--accent)] text-sm tracking-wide">العيوب والعشوائية <span className="text-[10px] font-normal opacity-80">(لخداع الـ AI)</span></h3>
                   </div>
                   <div className="space-y-3">
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة العدسة (Lens)</label>
                       <select value={state.lensCondition} onChange={e => setState({...state, lensCondition: e.target.value as LensCondition})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="modern-iphone">عدسة نظيفة (آيفون حديث)</option>
                         <option value="budget-android">معالجة رديئة (أندرويد اقتصادي)</option>
                         <option value="smudged-lens">عدسة متسخة (توهج وضبابية)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة القماش والتجاعيد</label>
                       <select value={state.clothingCondition} onChange={e => setState({...state, clothingCondition: e.target.value as ClothingCondition})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="crisp">مرتب ومكوي (مثالي)</option>
                         <option value="worn-all-day">ملبوس طوال اليوم (طيات واقعية)</option>
                         <option value="vintage-washed">قديم ومغسول (باهت ومتآكل)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">الجو والمحيط</label>
                       <select value={state.atmosphericCondition} onChange={e => setState({...state, atmosphericCondition: e.target.value as AtmosphericCondition})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="neutral">طبيعي</option>
                         <option value="high-humidity">رطوبة/صيف (تعرق البشرة)</option>
                         <option value="dusty-haze">غبار/عج (تباين منخفض)</option>
                         <option value="breezy">هواء متحرك (للشعر والملابس)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">المشتتات البصرية (Foreground)</label>
                       <select value={state.foregroundObstruction} onChange={e => setState({...state, foregroundObstruction: e.target.value as ForegroundObstruction})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="clean">كادر نظيف بالكامل</option>
                         <option value="through-glass">من خلف زجاج (انعكاسات)</option>
                         <option value="foreground-clutter">عنصر مشتت قريب من العدسة</option>
                       </select>
                     </div>
                   </div>
                </section>

                <section>
                   <h3 className="font-medium mb-3">نمط محرك التوليد</h3>
                   <div className="flex justify-between items-center p-1 bg-white/5 rounded-xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--accent)]">
                      <select value={state.realismStyle} onChange={e => setState({...state, realismStyle: e.target.value as RealismStyle})} className="w-full bg-transparent text-[var(--accent)] text-sm outline-none rounded p-3 font-bold cursor-pointer">
                         <option value="anti-ai-raw">خام مضاد للاكتشاف 🚀 (موصى به)</option>
                         <option value="raw-candid">واقعي طبيعي</option>
                         <option value="cinematic-realism">واقعي سينمائي (قد يبدو AI)</option>
                      </select>
                   </div>
                </section>
             </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-[var(--bg-main)]/95 backdrop-blur-md border-t border-[var(--border)] pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
           {state.sceneFamily && (
             <div className="flex justify-between items-center mb-3 px-1">
               <div className="text-xs text-[var(--text-muted)] truncate">{activeFamily?.labelAR} • {state.activity}</div>
               <button onClick={handleSavePreset} aria-label="حفظ كقالب" className="text-xs text-[var(--accent)] font-medium hover:text-[#e0c496] flex items-center gap-1 focus-ring rounded p-1 transition-colors">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                 حفظ كقالب
               </button>
             </div>
           )}
           <div className="flex gap-3">
             <button onClick={handleSmartComposition} className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 focus-ring transition-colors">عشوائي</button>
             <button disabled={!state.sceneFamily} onClick={() => setShowPromptSheet(true)} className="flex-[2] py-3.5 rounded-xl bg-[var(--accent)] text-black text-sm font-bold shadow-[0_0_15px_rgba(198,168,117,0.2)] hover:bg-[#d6b783] disabled:opacity-50 focus-ring transition-colors">عرض البرومبت</button>
           </div>
        </div>

        {showPromptSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPromptSheet(false)}></div>
            <div className="relative bg-[var(--bg-card)] w-full h-[85vh] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]">
               <div className="p-4 border-b border-white/5 flex justify-between items-center">
                  <div className="flex gap-4">
                     <button onClick={() => setActiveTab('chatgpt')} className={`text-sm font-medium pb-1 border-b-2 focus-ring ${activeTab==='chatgpt' ? 'border-[var(--accent)] text-white' : 'border-transparent text-[var(--text-muted)]'}`}>ChatGPT</button>
                     <button onClick={() => setActiveTab('gemini')} className={`text-sm font-medium pb-1 border-b-2 focus-ring ${activeTab==='gemini' ? 'border-[var(--accent)] text-white' : 'border-transparent text-[var(--text-muted)]'}`}>Gemini</button>
                  </div>
                  <button onClick={() => setShowPromptSheet(false)} aria-label="إغلاق" className="text-[var(--text-muted)] p-2 hover:bg-white/10 rounded-full focus-ring transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-5 relative" dir="ltr">
                  <textarea readOnly className="w-full h-full bg-transparent text-[var(--text-main)] text-[13px] leading-relaxed resize-none focus-ring rounded-lg p-2 font-mono" value={activeTab === 'chatgpt' ? chatGPTPrompt : geminiPrompt}/>
               </div>
               <div className="p-5 border-t border-white/5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                  <button onClick={() => copyToClipboard(activeTab === 'chatgpt' ? chatGPTPrompt : geminiPrompt)} className="w-full py-3.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium flex items-center justify-center gap-2 focus-ring transition-colors">
                    <span>نسخ البرومبت</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
               </div>
            </div>
          </div>
        )}

        {showPresetsSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPresetsSheet(false)}></div>
            <div className="relative bg-[var(--bg-card)] w-full max-h-[70vh] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]">
               <div className="p-5 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-lg font-bold">القوالب المحفوظة</h3>
                  <button onClick={() => setShowPresetsSheet(false)} aria-label="إغلاق" className="text-[var(--text-muted)] p-2 hover:bg-white/10 rounded-full focus-ring transition-colors">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-5">
                  {presets.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-10 text-sm">لا يوجد قوالب محفوظة حالياً.</div>
                  ) : (
                    <div className="space-y-3">
                      {presets.map(preset => (
                        <div key={preset.id} className="bg-[var(--bg-hover)] border border-white/5 p-4 rounded-xl flex justify-between items-center focus-within:ring-2 focus-within:ring-[var(--accent)]">
                           <div className="flex-1 cursor-pointer outline-none" tabIndex={0} onClick={() => {setState(preset.state); setShowPresetsSheet(false);}}>
                             <h4 className="font-medium text-sm mb-1">{preset.name}</h4>
                             <p className="text-xs text-[var(--text-muted)]">{preset.state.captureType} • {preset.state.subScene}</p>
                           </div>
                           <button onClick={() => deletePreset(preset.id)} aria-label="حذف" className="text-red-400/70 p-3 hover:bg-white/5 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
