import React, { useState, useEffect, useRef } from 'react';
import { getCompatibleLightingSuggestions, getLightingProfile, getSmartDayTime, getSmartLightingSuggestions } from './engine/lighting';
import { buildPromptIR, lintPromptIR, renderPromptIR, type PromptFacts } from './engine/promptIR';
import { resolveSceneConflicts } from './engine/rules';
import { buildSmartComposition } from './engine/smartComposition';
import { buildPhysicalProfile, lintPhysicalText, mergeFabricPhysics } from './engine/physics';
import { buildNegativeConstraints } from './engine/constraints';
import { buildGroupSelfieProfile, lintGroupSelfieText, type GroupSelfieCompanionCount } from './engine/groupSelfie';

import { REFERENCE_IMAGE_ACCEPT, sanitizeReferenceImage } from './engine/referenceImage';

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
type BackgroundDynamics = 'empty' | 'casual' | 'busy';
type FramingImperfection = 'perfect' | 'dutch-angle' | 'awkward-crop';

interface SceneState {
  referenceImageId: string | null;
  hasGlasses: boolean;
  sceneFamily: SceneFamilyId | null;
  subScene: string;
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
  groupSelfieEnabled: boolean;
  groupSelfieCompanionCount: GroupSelfieCompanionCount;
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
  framingImperfectionDetails: string;
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
  negativePrompt: string;
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
const IDENTITY_LOCK = `Preserve exact facial identity from the reference image. 193cm height, 83kg weight, tall lean-athletic male build. DO NOT alter facial proportions, head geometry, hairline, or natural hair density. DO NOT artificially beautify, de-age, or smooth skin. Preserve natural facial asymmetry and existing beard/moustache growth pattern.`;

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
  { id: 'bed3', labelAR: 'طقم بيجامة قطنية كحلية', category: ['bedroom', 'living-room'], prompt: 'navy blue cotton lounge pajama set', physics: ['very soft drape', 'smooth wrinkle-free fall'] },
  { id: 'timeless01', labelAR: 'قميص كحلي مع بنطلون رمادي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve deep navy blue dress shirt tucked neatly into medium grey tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless02', labelAR: 'قميص أزرق فاتح مع بنطلون كحلي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve light blue dress shirt tucked neatly into deep navy tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless03', labelAR: 'قميص أبيض مع بنطلون بيج', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve crisp white dress shirt tucked neatly into beige khaki tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless04', labelAR: 'قميص زيتي مع بنطلون بني', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve olive green dress shirt tucked neatly into rich brown tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless05', labelAR: 'قميص أسود مع بنطلون فحمي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve solid black dress shirt tucked neatly into dark charcoal tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless06', labelAR: 'قميص بيج جملي مع بنطلون أبيض', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve camel beige dress shirt tucked neatly into clean white tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless07', labelAR: 'قميص رمادي مع بنطلون أسود', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve medium grey dress shirt tucked neatly into solid black tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless08', labelAR: 'قميص أخضر مريمي مع بنطلون كريمي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve muted sage green dress shirt tucked neatly into cream tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless09', labelAR: 'قميص وردي فاتح مع بنطلون رمادي فحمي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve soft pastel pink dress shirt tucked neatly into charcoal grey tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless10', labelAR: 'قميص أبيض مع بنطلون كحلي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve crisp white dress shirt tucked neatly into deep navy blue tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless11', labelAR: 'قميص عنابي مع بنطلون رمادي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve deep burgundy dress shirt tucked neatly into medium grey tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless12', labelAR: 'قميص أسود مع بنطلون بيج فاتح', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve solid black dress shirt tucked neatly into light beige tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless13', labelAR: 'قميص أزرق فولاذي مع بنطلون كاكي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve steel blue dress shirt tucked neatly into khaki tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless14', labelAR: 'قميص أبيض مع بنطلون زيتي', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve crisp white dress shirt tucked neatly into olive green tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] },
  { id: 'timeless15', labelAR: 'قميص فحمي مع بنطلون رمادي فاتح', category: ['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym'], prompt: 'fitted long-sleeve dark charcoal dress shirt tucked neatly into light grey tailored trousers with a clean black leather belt', physics: ['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure'] }

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
  { id: 'h6', labelAR: 'عسكري (قصير جداً ومحدد)', prompt: 'very short neat military regulation haircut', physics: 'tight fade on sides, minimal volume on top, preserving the exact biological hairline and scalp visibility from the reference' }
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
  const mode = state.backgroundDynamics ?? 'empty';
  if (mode === 'empty') {
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
  const busy = mode === 'busy';

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

// --- REALISM DERIVATION ---
const deriveRealismState = (state: SceneState): DerivedSceneState => {
  const lightingProfile = getLightingProfile(state.lightingMode);
  const physicalProfile = buildPhysicalProfile({
    hasGlasses: state.hasGlasses,
    clothingCondition: state.clothingCondition,
    captureType: state.captureType,
    pose: state.pose,
    handProp: state.handProp,
    facialHairState: state.facialHairState
  });
  const groupSelfieProfile = buildGroupSelfieProfile({
    enabled: state.groupSelfieEnabled,
    companionCount: state.groupSelfieCompanionCount,
    captureType: state.captureType
  });
  const derived: DerivedSceneState = {
    skinResponse: physicalProfile.skinResponse,
    hairCondition: physicalProfile.hairCondition,
    fabricBehavior: [...physicalProfile.fabricBehavior],
    shadowBehavior: 'physically plausible contact shadows',
    environmentalLightBehavior: 'natural indirect bounce light',
    cameraDistance: 'arm-length distance (approx 40-60cm)',
    visibleBackgroundElements: [],
    contactPhysics: [...physicalProfile.contactPhysics],
    reflectionRules: [],
    realismConstraints: ['MUST LOOK LIKE AN UNEDITED SMARTPHONE SNAPSHOT', 'NO PROFESSIONAL STUDIO LIGHTING', 'NO CGI OR 3D RENDER AESTHETICS', ...physicalProfile.realismConstraints],
    lensEffects: ['standard smartphone computational photography', ...physicalProfile.eyewearLensEffects].join(', '),
    handPropDetails: '',
    facialHairDetails: '',
    flashEffects: '',
    framingImperfectionDetails: 'balanced intentional framing with natural smartphone headroom'
  };

  // --- 1. Typed Human & Material Physics ---
  // Skin, hair, fabric, contact, and baseline eyewear physics are compiled in engine/physics.ts.

  // --- 2. Layered Lighting Engine ---
  // Ambient/practical illumination and capture flash are separate physical layers.
  derived.environmentalLightBehavior = lightingProfile.ambientDescription;
  derived.shadowBehavior = `${lightingProfile.shadowDescription}, deep physically plausible contact occlusion where surfaces meet`;

  // Profile-driven light/sensor/subject response keeps every new lighting mode physically synchronized.
  if (lightingProfile.sensorDescription) {
    derived.lensEffects += `, ${lightingProfile.sensorDescription}`;
  }
  if (lightingProfile.subjectResponseDescription) {
    derived.skinResponse += `, ${lightingProfile.subjectResponseDescription}`;
  }
  if (state.hasGlasses && lightingProfile.eyewearEffectDescription) {
    derived.lensEffects += `, ${lightingProfile.eyewearEffectDescription}`;
  }
  if (state.hasGlasses && lightingProfile.eyewearShadowDescription) {
    derived.shadowBehavior += `, ${lightingProfile.eyewearShadowDescription}`;
  }

  // Direct flash is a camera event layered on top of the selected ambient model.
  if (state.flashMode === 'direct-flash') {
    derived.flashEffects = 'Direct on-axis smartphone flash with sharp near-subject shadows, localized specular highlights, rapid inverse-square falloff, and limited highlight headroom. The flash supplements the selected ambient source rather than erasing it.';
    derived.shadowBehavior += ', plus a sharper flash-cast shadow close behind the subject wherever a nearby surface exists';
    derived.skinResponse += ', stronger physically localized flash specular highlights that reveal pores rather than smoothing them';
    derived.lensEffects += ', slight flash highlight clipping and a restrained organic flare only when reflective geometry supports it';
  }

  // --- 4. Sensor Limitations (Anti-AI Raw) ---
  if (state.realismStyle === 'anti-ai-raw') {
    derived.lensEffects += ', slight chromatic aberration (purple/green fringing) on high-contrast edges, microscopic sensor grain';
    derived.realismConstraints.push('NO impossible room-wide ambient fill light', 'NO perfectly white-balanced lighting, allow natural color casts', 'NO artificial denoising', 'ZERO digital skin smoothing or airbrushing', 'preserve visible pores, fine lines, dark circles, eyelash irregularity, and uncorrected skin texture', 'NO beauty-filter eye enlargement, glowing eyes, or doll-like facial cleanup');
  }

  // --- 5. Camera & Lens Logic ---
  if (state.captureType === 'front-selfie') {
    if (groupSelfieProfile.active) {
      derived.lensEffects = `${groupSelfieProfile.lensDescriptor}. ${derived.lensEffects}`;
      derived.cameraDistance = groupSelfieProfile.cameraDistance;
    } else {
      derived.lensEffects = 'smartphone front-camera aesthetic, 24mm equivalent focal length, slight natural barrel distortion at frame edges, handheld micro-shake. ' + derived.lensEffects;
      derived.cameraDistance = state.framing === 'head-shoulders' ? 'close arm-reach (approx 40cm)' : 'extended arm-reach (approx 65cm)';
    }
  } else if (state.captureType === 'mirror-selfie') {
    derived.reflectionRules.push('geometrically accurate mirror reflection, smartphone clearly visible in hand, slight mirror glass imperfection or dust motes on surface');
    derived.lensEffects = 'smartphone main camera capturing a reflection, 26mm equivalent, natural focus on the mirror surface, slight depth falloff. ' + derived.lensEffects;
  } else {
    derived.cameraDistance = 'third-person candid distance (approx 1.5 - 3 meters)';
    derived.realismConstraints.push('candid framing without selfie-arm mechanics, natural depth of field');
    derived.lensEffects = 'smartphone main camera aesthetic, 35mm equivalent focal length, natural f/1.8 depth of field with gradual, non-artificial background blur. ' + derived.lensEffects;
    if (state.useDigitalZoom) {
      derived.lensEffects = 'smartphone digital zoom artifacts from an in-sensor crop, slight watercolor-like upscaling on fine textures such as hair and fabric fibers, loss of micro-contrast, mild edge sharpening halos. ' + derived.lensEffects;
      derived.realismConstraints.push('digital zoom must reduce fine-detail fidelity rather than creating artificial optical bokeh');
    }
  }

  if (state.framingImperfection === 'dutch-angle') {
    derived.framingImperfectionDetails = 'unintentional slight Dutch angle of roughly 2-5 degrees, imperfect horizon, casual amateur phone handling';
  } else if (state.framingImperfection === 'awkward-crop') {
    derived.framingImperfectionDetails = 'awkward amateur crop with slightly tight or uneven headroom and imperfect centering, while keeping the eyes, chin, and essential facial identity readable';
  } else {
    derived.framingImperfectionDetails = 'balanced intentional framing with natural smartphone headroom and no artificial studio-perfect symmetry';
  }

  // --- 7. Background Details ---
  let baseDetails: string[] = [];
  if (state.sceneFamily === 'military-base') {
    baseDetails = ['official institutional document folders', 'neutral formal walls', 'subtle framed national emblem'];
    if (state.subScene.includes('مواقف')) baseDetails = ['realistic asphalt parking lot', 'parked official white SUVs', 'harsh daylight reflections'];
  } else if (state.sceneFamily === 'car') {
    const dashboardDetail = lightingProfile.soleAmbientSource
      ? 'dark inactive dashboard controls and trim with no emitted cabin fill light'
      : 'ordinary dashboard controls and sleek interior trim';
    baseDetails = ['premium dark leather seat texture', 'seatbelt edge', dashboardDetail, 'sleek interior trim'];
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

  // --- 9. Hand Prop Details ---
  if (state.handProp !== 'none' && (state.handProp !== 'adjusting-glasses' || state.hasGlasses)) {
    const prop = HAND_PROPS.find(p => p.id === state.handProp);
    if (prop) {
      derived.handPropDetails = prop.prompt;
    }
  }

  // --- 10. Facial Hair Details ---
  const facialHair = FACIAL_HAIR_STATES.find(f => f.id === state.facialHairState);
  if (facialHair) {
    derived.facialHairDetails = facialHair.prompt;
  }

  return derived;
};

const buildSemanticScene = (state: SceneState, derived: DerivedSceneState): SemanticScene => {
  const outfit = OUTFITS.find(o => o.id === state.outfitId);
  const hair = HAIRSTYLES.find(h => h.id === state.hairStyle);
  const expression = EXPRESSIONS.find(e => e.id === state.expression);
  const gaze = GAZE_DIRECTIONS.find(g => g.id === state.gazeDirection);
  const backgroundDynamics = resolveBackgroundDynamics(state);
  const fabricPhysics = mergeFabricPhysics(outfit?.physics || [], derived.fabricBehavior);
  const groupSelfieProfile = buildGroupSelfieProfile({ enabled: state.groupSelfieEnabled, companionCount: state.groupSelfieCompanionCount, captureType: state.captureType });

  let captureMechanics = '';
  if (state.captureType === 'front-selfie') {
    captureMechanics = groupSelfieProfile.active
      ? `${groupSelfieProfile.captureMechanics} Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Amateur framing behavior: ${derived.framingImperfectionDetails}. Main-subject gaze: ${gaze?.prompt}. Shooter anatomy: ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`
      : `Smartphone front-camera selfie. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Amateur framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}. ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`;
  } else if (state.captureType === 'mirror-selfie') {
    captureMechanics = `Smartphone mirror selfie. Framing: ${state.framing}. Distance: ${derived.cameraDistance}. Framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}. ${derived.reflectionRules.join('. ')}`;
  } else {
    captureMechanics = `Third-person candid photograph. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}.`;
  }

  let cameraRealism = `Style: ${state.realismStyle.replace('-', ' ')}. ${derived.lensEffects}. Avoid CGI glossy look.`;
  if (state.realismStyle === 'anti-ai-raw') {
     cameraRealism = `Style: Absolute raw hyper-realism. Unedited, unfiltered mobile capture. ${derived.lensEffects}. Preserve believable sensor limitations and ordinary handheld imperfections.`;
  }

  const identityBase = state.hasGlasses
    ? `${IDENTITY_LOCK} The subject wears eyeglasses in the reference image: STRICTLY preserve the exact same frame shape, color, proportions, lens geometry, bridge fit, and temple position.`
    : IDENTITY_LOCK;

  return {
    identity: groupSelfieProfile.active ? `${identityBase} ${groupSelfieProfile.identityRules}` : identityBase,
    body: '193cm, 83kg, tall lean-athletic male build.',
    captureMechanics,
    hair: `${hair?.prompt}. Physics: ${hair?.physics}. ${derived.hairCondition}.`,
    expression: `${expression?.prompt || 'neutral'}, slightly realistic tired eyes, natural imperfect eyelashes that clump together randomly, subtle natural dark circles under eyes, unglamorous real-world facial expression`,
    outfit: outfit?.prompt || '',
    outfitPhysics: fabricPhysics.text,
    poseAndContact: `Pose: ${state.pose}. Activity: ${state.activity}. Contact rules: ${derived.contactPhysics.filter(p => !p.includes('arm')).join('. ')}${groupSelfieProfile.active ? `. Group anatomical integrity: ${groupSelfieProfile.anatomyRules} Group candid dynamics: ${groupSelfieProfile.dynamicsRules}` : ''}`,
    visibleEnvironment: `Location: ordinary realistic ${SCENE_FAMILIES[state.sceneFamily!].labelAR} setting. Visible elements: ${derived.visibleBackgroundElements.join(', ')}. No iconic landmarks. Environment state: ${state.environmentRealism}.`,
    lighting: `Time: ${state.timeOfDay}. Lighting source: ${state.lightingMode}. Behavior: ${derived.environmentalLightBehavior}. Shadows: ${derived.shadowBehavior}.`,
    skinResponse: derived.skinResponse,
    cameraRealism: cameraRealism,
    styleConstraints: Array.from(new Set([...derived.realismConstraints, ...backgroundDynamics.constraints, ...groupSelfieProfile.styleConstraints])).join('. '),
    handProp: derived.handPropDetails,
    facialHair: derived.facialHairDetails,
    flashDetails: derived.flashEffects,
    shadowBehavior: derived.shadowBehavior,
    backgroundDynamics: backgroundDynamics.description,
    negativePrompt: buildNegativeConstraints({ backgroundDynamics: state.backgroundDynamics, groupSelfieEnabled: groupSelfieProfile.active }).join(', ')
  };
};

const buildPromptText = (semantic: SemanticScene, aiType: 'chatgpt' | 'gemini', state: SceneState): string => {
  const facts: PromptFacts = {
    hasGlasses: state.hasGlasses,
    backgroundDynamics: state.backgroundDynamics,
    captureType: state.captureType,
    useDigitalZoom: state.useDigitalZoom,
    lightingMode: state.lightingMode,
    timeOfDay: state.timeOfDay
  };

  const ir = buildPromptIR(semantic);
  const warnings = lintPromptIR(ir, facts);
  const physicsWarnings = lintPhysicalText(
    [semantic.hair, semantic.outfitPhysics, semantic.poseAndContact, semantic.skinResponse, semantic.cameraRealism, semantic.styleConstraints].join('\n'),
    { hasGlasses: state.hasGlasses, captureType: state.captureType }
  );
  const groupWarnings = lintGroupSelfieText(
    [semantic.identity, semantic.captureMechanics, semantic.poseAndContact, semantic.cameraRealism, semantic.styleConstraints].join('\n'),
    { enabled: state.groupSelfieEnabled, companionCount: state.groupSelfieCompanionCount, captureType: state.captureType }
  );
  ir.warnings.push(...warnings, ...physicsWarnings, ...groupWarnings);
  if (warnings.length || physicsWarnings.length || groupWarnings.length) console.warn('[PhysFrame PromptLint]', [...warnings, ...physicsWarnings, ...groupWarnings]);
  return renderPromptIR(ir, aiType);
};

// --- MAIN REACT APPLICATION ---
const DEFAULT_STATE: SceneState = {
  referenceImageId: null, hasGlasses: false, sceneFamily: null, subScene: '', activity: '', captureType: 'front-selfie', framing: 'chest-up', cameraAngle: 'eye-level', framingImperfection: 'perfect', useDigitalZoom: false, pose: '', outfitId: 'mil3', hairStyle: 'h2', expression: 'e1', timeOfDay: 'midday', lightingMode: '', environmentRealism: 'رسمية ومنظمة', realismStyle: 'anti-ai-raw', lensCondition: 'modern-iphone', clothingCondition: 'crisp', atmosphericCondition: 'neutral', foregroundObstruction: 'clean', gazeDirection: 'at-camera', handProp: 'none', facialHairState: '3-day-stubble', flashMode: 'no-flash', backgroundDynamics: 'empty', groupSelfieEnabled: false, groupSelfieCompanionCount: 2
};

const normalizeSceneState = (candidate: unknown): SceneState => {
  const raw: Record<string, unknown> = candidate && typeof candidate === 'object' ? { ...(candidate as Record<string, unknown>) } : {};

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


export default function PhysFrameApp() {
  const [state, setState] = useState<SceneState>(DEFAULT_STATE);
  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'gemini'>('chatgpt');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasReference, setHasReference] = useState<boolean>(false);
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [showPresetsSheet, setShowPresetsSheet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedState = localStorage.getItem('physframe_current_state');
        if (savedState) setState(normalizeSceneState(JSON.parse(savedState)));
        const savedPresets = localStorage.getItem('physframe_presets');
        if (savedPresets) {
          const parsedPresets = JSON.parse(savedPresets);
          if (Array.isArray(parsedPresets)) {
            setPresets(parsedPresets
              .filter((preset): preset is SavedPreset => Boolean(preset && typeof preset === 'object' && 'state' in preset))
              .map(preset => ({ ...preset, state: normalizeSceneState(preset.state) })));
          }
        }
        const blob = await loadImageFromDB();
        if (blob) {
          try {
            const safeBlob = await sanitizeReferenceImage(blob);
            await saveImageToDB(safeBlob);
            setImageUrl(URL.createObjectURL(safeBlob));
            setHasReference(true);
          } catch (error) {
            console.warn('Discarded an unsafe or unsupported stored reference image.', error);
            await deleteImageFromDB();
          }
        }
      } catch (e) { console.error('Failed to load local data', e); }
      setIsLoaded(true);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try { localStorage.setItem('physframe_current_state', JSON.stringify(state)); }
    catch (error) { console.warn('Could not persist PhysFrame state', error); }
  }, [state, isLoaded]);
  useEffect(() => { return () => { if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl); }; }, [imageUrl]);

  const activeFamily = state.sceneFamily ? SCENE_FAMILIES[state.sceneFamily] : null;

  const lightingSuggestions = state.sceneFamily
    ? getSmartLightingSuggestions({
        sceneFamily: state.sceneFamily,
        subScene: state.subScene,
        timeOfDay: state.timeOfDay,
        activity: state.activity
      }, 4)
    : [];
  const compatibleLightingSuggestions = state.sceneFamily
    ? getCompatibleLightingSuggestions({
        sceneFamily: state.sceneFamily,
        subScene: state.subScene,
        timeOfDay: state.timeOfDay,
        activity: state.activity
      })
    : [];
  const smartDayTime = state.sceneFamily ? getSmartDayTime(state.sceneFamily, state.subScene) : 'midday';
  const smartDayLabel = smartDayTime === 'morning' ? 'صباح' : smartDayTime === 'afternoon' ? 'عصر' : 'ظهر';

  const handleTimeSelection = (timeOfDay: TimeOfDay) => {
    setState(current => {
      if (!current.sceneFamily) return { ...current, timeOfDay };
      const allCompatible = getCompatibleLightingSuggestions({
        sceneFamily: current.sceneFamily,
        subScene: current.subScene,
        timeOfDay,
        activity: current.activity
      });
      const currentStillValid = allCompatible.some(item => item.labelAR === current.lightingMode);
      return {
        ...current,
        timeOfDay,
        lightingMode: currentStillValid ? current.lightingMode : (allCompatible[0]?.labelAR ?? current.lightingMode)
      };
    });
  };

  const handleSmartLightingPeriod = (period: 'day' | 'night') => {
    setState(current => {
      if (!current.sceneFamily) return current;
      const timeOfDay: TimeOfDay = period === 'night'
        ? 'night'
        : getSmartDayTime(current.sceneFamily, current.subScene);
      const suggested = getSmartLightingSuggestions({
        sceneFamily: current.sceneFamily,
        subScene: current.subScene,
        timeOfDay,
        activity: current.activity
      }, 1)[0];
      return { ...current, timeOfDay, lightingMode: suggested?.labelAR ?? current.lightingMode };
    });
  };

  useEffect(() => {
    if (!state.sceneFamily) return;
    const resolved = resolveSceneConflicts(state, SCENE_FAMILIES[state.sceneFamily]);
    if (JSON.stringify(resolved) !== JSON.stringify(state)) setState(resolved);
  }, [state.sceneFamily, state.subScene, state.activity, state.pose, state.lightingMode, state.timeOfDay, state.captureType, state.foregroundObstruction, state.atmosphericCondition, state.hasGlasses, state.handProp, state.environmentRealism, state.groupSelfieEnabled]);

  const handleSceneSelect = (familyId: SceneFamilyId) => {
    const family = SCENE_FAMILIES[familyId];
    setState({ ...state, sceneFamily: familyId, subScene: family.subScenes[0], activity: family.activities[0], pose: family.poses[0], lightingMode: family.allowedLighting[0], environmentRealism: family.environmentRealism[0] });
  };

  const handleSmartComposition = () => {
    setState(current => buildSmartComposition(current, SCENE_FAMILIES));
  };

  const handleVibePreset = (preset: VibePreset) => setState({ ...state, ...preset.state, outfitId: state.outfitId, hairStyle: state.hairStyle });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let safeImage: Blob;
    try {
      safeImage = await sanitizeReferenceImage(file);
    } catch (error) {
      console.warn('Rejected unsafe or unsupported reference image.', error);
      e.currentTarget.value = '';
      return;
    }

    try {
      await saveImageToDB(safeImage);
    } catch (error) {
      console.warn('Could not persist reference image in IndexedDB; using session preview only.', error);
    }

    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(safeImage));
    setHasReference(true);
    setState(prev => ({ ...prev, referenceImageId: file.name }));
  };

  const handleImageDelete = async () => {
    try {
      await deleteImageFromDB();
    } catch (error) {
      console.warn('Could not remove reference image from IndexedDB.', error);
    }

    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setHasReference(false);
    setState(prev => ({ ...prev, referenceImageId: null }));
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
    chatGPTPrompt = buildPromptText(semantic, 'chatgpt', state);
    geminiPrompt = buildPromptText(semantic, 'gemini', state);
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
               <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept={REFERENCE_IMAGE_ACCEPT} className="hidden" />
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
                   <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept={REFERENCE_IMAGE_ACCEPT} className="hidden" />
                 </div>
              </div>
            </div>
          )}
          <label className="mt-3 flex items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 cursor-pointer">
            <div>
              <span className="text-sm font-medium block">هل الشخص يرتدي نظارة؟</span>
              <span className="text-[10px] text-[var(--text-muted)]">يُستخدم لتثبيت النظارة وفيزياء العدسات فقط عند التفعيل</span>
            </div>
            <input type="checkbox" checked={state.hasGlasses} onChange={e => setState({...state, hasGlasses: e.target.checked})} className="w-5 h-5 accent-[var(--accent)] shrink-0" />
          </label>
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
                  <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">الخلفية والبيئة</h3>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1">حركة الخلفية</label>
                  <select value={state.backgroundDynamics} onChange={e => setState({...state, backgroundDynamics: e.target.value as BackgroundDynamics})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm appearance-none focus-ring">
                    <option value="empty">فارغة وهادئة</option>
                    <option value="casual">عابرون غير مبالين</option>
                    <option value="busy">مزدحمة وحركية</option>
                  </select>
                </section>

                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
                   <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">إعدادات الكاميرا والكادر</h3>
                   <div className="flex gap-2 mb-3">
                      {[{id:'front-selfie', l:'أمامية'}, {id:'mirror-selfie', l:'مرآة'}, {id:'third-person-candid', l:'عفوية'}].map(t => (
                        <button key={t.id} onClick={() => setState({...state, captureType: t.id as CaptureType, groupSelfieEnabled: t.id === 'front-selfie' ? state.groupSelfieEnabled : false})} className={`flex-1 py-2 rounded-lg text-xs border focus-ring transition-colors ${state.captureType === t.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)] font-medium' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
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
                  {state.captureType === 'front-selfie' && (
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center justify-between gap-3 bg-black/10 border border-[var(--border)] rounded-xl px-3 py-2.5 cursor-pointer">
                        <div>
                          <span className="text-xs font-medium block">سيلفي جماعي</span>
                          <span className="text-[10px] text-[var(--text-muted)]">الموضوع الرئيسي هو المصوّر، مع منع استنساخ وجوه المرافقين</span>
                        </div>
                        <input type="checkbox" checked={state.groupSelfieEnabled} onChange={e => setState({...state, groupSelfieEnabled: e.target.checked})} className="w-5 h-5 accent-[var(--accent)]" />
                      </label>
                      {state.groupSelfieEnabled && (
                        <div>
                          <label className="text-[11px] text-[var(--text-muted)] block mb-1">عدد المرافقين</label>
                          <select value={state.groupSelfieCompanionCount} onChange={e => setState({...state, groupSelfieCompanionCount: Number(e.target.value) as GroupSelfieCompanionCount})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring">
                            <option value={1}>شخص واحد معي</option>
                            <option value={2}>شخصان معي</option>
                            <option value={3}>ثلاثة أشخاص معي</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-3">
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">عدم مثالية التأطير</label>
                    <select value={state.framingImperfection} onChange={e => setState({...state, framingImperfection: e.target.value as FramingImperfection})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring">
                      <option value="perfect">تأطير مثالي</option>
                      <option value="dutch-angle">ميلان عشوائي</option>
                      <option value="awkward-crop">تأطير سيء للرأس</option>
                    </select>
                  </div>
                  {state.captureType === 'third-person-candid' && (
                    <label className="mt-3 flex items-center justify-between gap-3 bg-black/10 border border-[var(--border)] rounded-xl px-3 py-2.5 cursor-pointer">
                      <span className="text-xs">استخدام تقريب رقمي للهاتف</span>
                      <input type="checkbox" checked={state.useDigitalZoom} onChange={e => setState({...state, useDigitalZoom: e.target.checked})} className="w-5 h-5 accent-[var(--accent)]" />
                    </label>
                  )}
                </section>

                <section>
                   <h3 className="font-medium mb-3">الملابس والشخصية</h3>
                   <select value={state.outfitId} onChange={e => setState({...state, outfitId: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm appearance-none focus-ring mb-3 text-white">
                     {OUTFITS.map(o => <option key={o.id} value={o.id}>{o.labelAR}</option>)}
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
                         {HAND_PROPS.filter(p => state.hasGlasses || p.id !== 'adjusting-glasses').map(p => <option key={p.id} value={p.id}>{p.labelAR}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة اللحية</label>
                       <select value={state.facialHairState} onChange={e => setState({...state, facialHairState: e.target.value as FacialHairState})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {FACIAL_HAIR_STATES.map(f => <option key={f.id} value={f.id}>{f.labelAR}</option>)}
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
                   <div className="flex items-start justify-between gap-3 mb-3">
                     <div>
                       <h3 className="font-medium text-sm text-[var(--text-muted)]">الوقت والإضاءة الفيزيائية</h3>
                       <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-4">يقرأ المكان والفرع والنشاط ثم يرتب المصادر الممكنة بدون إضاءة استوديو وهمية.</p>
                     </div>
                     <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">ذكي</span>
                   </div>

                   <div className="grid grid-cols-2 gap-2 mb-4">
                     <button onClick={() => handleSmartLightingPeriod('day')} className={`p-3 rounded-xl border text-right transition-colors focus-ring ${state.timeOfDay !== 'night' ? 'bg-amber-400/10 border-amber-300/30 text-amber-100' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>
                       <span className="block text-sm font-medium">☀️ نهار ذكي</span>
                       <span className="block text-[10px] opacity-70 mt-1">يقترح: {smartDayLabel}</span>
                     </button>
                     <button onClick={() => handleSmartLightingPeriod('night')} className={`p-3 rounded-xl border text-right transition-colors focus-ring ${state.timeOfDay === 'night' ? 'bg-indigo-400/10 border-indigo-300/30 text-indigo-100' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>
                       <span className="block text-sm font-medium">🌙 ليل ذكي</span>
                       <span className="block text-[10px] opacity-70 mt-1">مصادر عملية حقيقية</span>
                     </button>
                   </div>

                   <label className="text-[11px] text-[var(--text-muted)] block mb-2">تحديد الوقت يدويًا</label>
                   <div className="flex flex-wrap gap-2 mb-4">
                      {[{id:'morning', l:'صباح'}, {id:'midday', l:'ظهر'}, {id:'afternoon', l:'عصر'}, {id:'sunset', l:'غروب'}, {id:'night', l:'ليل'}].map(t => (
                        <button key={t.id} onClick={() => handleTimeSelection(t.id as TimeOfDay)} className={`px-3 py-1.5 rounded-lg text-sm border focus-ring transition-colors ${state.timeOfDay === t.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
                      ))}
                   </div>

                   {lightingSuggestions.length > 0 && (
                     <div className="mb-4">
                       <label className="text-[11px] text-[var(--text-muted)] block mb-2">مقترحة لهذا المشهد</label>
                       <div className="space-y-2">
                         {lightingSuggestions.map((suggestion, index) => (
                           <button key={suggestion.labelAR} onClick={() => setState({...state, lightingMode: suggestion.labelAR})} className={`w-full text-right p-3 rounded-xl border transition-colors focus-ring ${state.lightingMode === suggestion.labelAR ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40' : 'bg-black/10 border-[var(--border)] hover:bg-white/5'}`}>
                             <div className="flex items-center justify-between gap-2">
                               <span className="text-xs font-medium">{suggestion.labelAR}</span>
                               <span className={`text-[9px] px-2 py-0.5 rounded-full ${index === 0 ? 'bg-[var(--accent)] text-black' : 'bg-white/5 text-[var(--text-muted)]'}`}>{index === 0 ? '★ الأفضل' : index === 1 ? 'مناسب جدًا' : 'متوافق'}</span>
                             </div>
                             <span className="block text-[10px] leading-4 text-[var(--text-muted)] mt-1">{suggestion.reasonAR}</span>
                           </button>
                         ))}
                       </div>
                     </div>
                   )}

                   <div>
                     <label className="text-[11px] text-[var(--text-muted)] block mb-1">كل الإضاءات الفيزيائية المتوافقة</label>
                     <select value={state.lightingMode} onChange={e => setState({...state, lightingMode: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm appearance-none focus-ring">
                       {compatibleLightingSuggestions.map(item => <option key={item.labelAR} value={item.labelAR}>{item.labelAR}</option>)}
                     </select>
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
