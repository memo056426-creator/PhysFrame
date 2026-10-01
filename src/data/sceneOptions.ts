import type { LightingKind } from '../engine/lighting';
import type { SubSceneId } from './subScenes';
import type { ActivityId } from './activities';
import type { PoseId } from './poses';
import type { SceneState } from '../types/scene';

export const SCENE_FAMILIES = {
  'military-base': { labelAR: 'مبنى عمل عسكري', subScenes: ['military-office', 'building-corridor', 'sector-emblem-wall', 'sector-parking'] as SubSceneId[], activities: ['military-office-work', 'short-break', 'on-duty', 'standing-proud'] as ActivityId[], poses: ['standing-upright', 'seated-behind-desk', 'leaning-back-on-desk', 'standing-steady'] as PoseId[], allowedLighting: ['office-fluorescent', 'window-daylight', 'corridor-practical', 'midday-sun'] as LightingKind[], environmentRealism: ['رسمية ومنظمة', 'نشطة (عمل يومي)'] },
  'saudi-outdoor': { labelAR: 'أماكن سعودية', subScenes: ['residential-villa-street', 'modern-residential-neighborhood', 'local-commercial-street', 'cafe-front', 'parking-lot', 'neighborhood-park', 'fitness-walkway'] as SubSceneId[], activities: ['walking-calmly', 'standing-natural', 'waiting', 'seated-at-cafe'] as ActivityId[], poses: ['standing-steady', 'walking-natural', 'leaning-on-wall', 'leaning-back-on-wall', 'seated-on-chair'] as PoseId[], allowedLighting: ['natural-daylight', 'midday-sun', 'golden-hour', 'warm-street', 'commercial-neon'] as LightingKind[], environmentRealism: ['هادئ', 'طبيعي', 'نشط'] },
  'car': { labelAR: 'السيارة', subScenes: ['car-interior', 'beside-parked-car'] as SubSceneId[], activities: ['parked-behind-wheel', 'passenger-seat', 'seated-calm-in-car'] as ActivityId[], poses: ['relaxed-in-seat', 'leaning-on-steering-wheel'] as PoseId[], allowedLighting: ['natural-daylight', 'midday-sun', 'vehicle-interior', 'street-through-glass', 'phone-screen'] as LightingKind[], environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا'] },
  'living-room': { labelAR: 'صالة منزلية', subScenes: ['living-room-center', 'by-window', 'in-front-of-tv'] as SubSceneId[], activities: ['seated-on-sofa', 'standing-natural', 'drinking-coffee', 'using-phone'] as ActivityId[], poses: ['relaxed-on-sofa', 'standing-steady', 'leaning-on-table'] as PoseId[], allowedLighting: ['natural-daylight', 'ceiling-practical', 'mixed-night', 'phone-screen'] as LightingKind[], environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا'] },
  'bedroom': { labelAR: 'غرفة نوم', subScenes: ['beside-bed', 'bed-edge', 'wardrobe-front', 'with-laptop'] as SubSceneId[], activities: ['seated', 'standing-natural', 'relaxing', 'using-phone'] as ActivityId[], poses: ['seated-on-bed-edge', 'semi-reclined', 'leaning-on-the-wall', 'standing-steady'] as PoseId[], allowedLighting: ['natural-daylight', 'ceiling-practical', 'warm-lamp', 'phone-screen'] as LightingKind[], environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا'] },
  'gym': { labelAR: 'نادي رياضي', subScenes: ['beside-weights', 'mirror-area', 'equipment-area'] as SubSceneId[], activities: ['pre-workout', 'rest-between-sets', 'post-workout'] as ActivityId[], poses: ['standing-by-equipment', 'seated-on-gym-bench', 'holding-water-bottle'] as PoseId[], allowedLighting: ['gym-practical', 'natural-daylight'] as LightingKind[], environmentRealism: ['هادئ', 'طبيعي', 'نشط'] }
};

export const HAIRSTYLES = [
  { id: 'h1', labelAR: 'طبيعي', prompt: 'natural everyday hair', physics: 'maintains original natural density and texture' },
  { id: 'h2', labelAR: 'مرتب للخلف', prompt: 'neatly styled back hair', physics: 'styled but retaining natural hairline and volume' },
  { id: 'h3', labelAR: 'جانبي مرتب', prompt: 'neatly parted to the side hair', physics: 'clean part, natural resting volume' },
  { id: 'h4', labelAR: 'فوضوي خفيف', prompt: 'slightly messy casual hair', physics: 'natural unstyled resting state' },
  { id: 'h5', labelAR: 'بعد التمرين (مبلل قليلًا)', prompt: 'slightly sweat-dampened post-workout hair', physics: 'clumping slightly from mild moisture, retaining natural base density' },
  { id: 'h6', labelAR: 'عسكري (قصير جداً ومحدد)', prompt: 'very short neat military regulation haircut', physics: 'tight fade on sides, minimal volume on top, preserving the exact biological hairline and scalp visibility from the reference' }
];

export const EXPRESSIONS = [
  { id: 'e1', labelAR: 'محايد', prompt: 'neutral resting expression' },
  { id: 'e2', labelAR: 'هادئ', prompt: 'calm relaxed expression' },
  { id: 'e3', labelAR: 'ابتسامة خفيفة مغلقة', prompt: 'subtle closed-mouth smile' },
  { id: 'e4', labelAR: 'مركز', prompt: 'focused expression' },
  { id: 'e5', labelAR: 'حازم (رسمي)', prompt: 'firm serious professional expression' }
];

export const GAZE_DIRECTIONS = [
  { id: 'at-camera', labelAR: 'ينظر للعدسة', prompt: 'looking directly at camera lens' },
  { id: 'looking-away', labelAR: 'ينظر بعيداً', prompt: 'looking away from camera, candid moment' },
  { id: 'looking-down', labelAR: 'ينظر للأسفل', prompt: 'looking down at phone or object in hands' },
  { id: 'looking-out-window', labelAR: 'ينظر خارج النافذة', prompt: 'gazing out window, thoughtful expression' }
];

export const HAND_PROPS = [
  { id: 'none', labelAR: 'لا شيء', prompt: 'empty hands or naturally resting' },
  { id: 'phone', labelAR: 'يمسك هاتف', prompt: 'holding smartphone in one hand, screen visible' },
  { id: 'car-keys', labelAR: 'مفاتيح سيارة', prompt: 'holding car keys in hand, key fob visible' },
  { id: 'coffee-cup', labelAR: 'كوب قهوة', prompt: 'holding coffee cup, steam rising slightly' },
  { id: 'adjusting-glasses', labelAR: 'يعدل النظارة', prompt: 'hand adjusting eyeglasses frame' },
  { id: 'vape-cigarette', labelAR: 'فيب/سيجارة', prompt: 'holding vape or cigarette between fingers' }
];

export const FACIAL_HAIR_STATES = [
  { id: 'clean-shaven', labelAR: 'حلاقة نظيفة', prompt: 'clean shaven face, smooth jawline' },
  { id: '3-day-stubble', labelAR: 'لحية 3 أيام', prompt: '3-day stubble, visible coarse hair on jaw and cheeks' },
  { id: 'full-beard-neat', labelAR: 'لحية كاملة مرتبة', prompt: 'full neat beard, well-groomed' },
  { id: 'full-beard-unkempt', labelAR: 'لحية غير مهذبة', prompt: 'full unkempt beard, natural growth pattern, slightly messy' }
];

export const FLASH_MODES = [
  { id: 'no-flash', labelAR: 'بدون فلاش', prompt: 'no flash, natural ambient lighting only' },
  { id: 'direct-flash', labelAR: 'فلاش مباشر', prompt: 'direct smartphone flash, harsh frontal lighting' },
  { id: 'ambient-only', labelAR: 'إضاءة محيطة فقط', prompt: 'ambient lighting only, no artificial flash' }
];

export interface VibePreset { id: string; labelAR: string; icon: string; state: Partial<SceneState>; }

export const VIBE_PRESETS: VibePreset[] = [
  { id: 'night-drive', labelAR: 'قيادة ليلية هادئة', icon: '🌙', state: { sceneFamily: 'car', subScene: 'car-interior', activity: 'parked-behind-wheel', pose: 'relaxed-in-seat', timeOfDay: 'night', lightingMode: 'street-through-glass', captureType: 'front-selfie', gazeDirection: 'looking-down', handProp: 'phone', flashMode: 'ambient-only', foregroundObstruction: 'through-glass' } },
  { id: 'friday-morning', labelAR: 'صباح جمعة كاجوال', icon: '☕', state: { sceneFamily: 'living-room', subScene: 'by-window', activity: 'drinking-coffee', pose: 'relaxed-on-sofa', timeOfDay: 'morning', lightingMode: 'natural-daylight', captureType: 'third-person-candid', gazeDirection: 'looking-away', handProp: 'coffee-cup', flashMode: 'no-flash', outfitId: 'cas1' } },
  { id: 'post-workout', labelAR: 'بعد التمرين مباشرة', icon: '🏋️', state: { sceneFamily: 'gym', subScene: 'mirror-area', activity: 'post-workout', pose: 'standing-by-equipment', timeOfDay: 'midday', lightingMode: 'gym-practical', captureType: 'mirror-selfie', gazeDirection: 'at-camera', handProp: 'none', flashMode: 'no-flash', outfitId: 'gym1', hairStyle: 'h5', atmosphericCondition: 'high-humidity' } },
  { id: 'military-duty', labelAR: 'مناوبة عسكرية', icon: '🎖️', state: { sceneFamily: 'military-base', subScene: 'military-office', activity: 'military-office-work', pose: 'seated-behind-desk', timeOfDay: 'midday', lightingMode: 'office-fluorescent', captureType: 'third-person-candid', gazeDirection: 'at-camera', handProp: 'none', flashMode: 'no-flash', outfitId: 'mil3', facialHairState: 'clean-shaven' } }
];
