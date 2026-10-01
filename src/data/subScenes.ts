export type SubSceneId =
  | 'military-office'
  | 'building-corridor'
  | 'sector-emblem-wall'
  | 'sector-parking'
  | 'residential-villa-street'
  | 'modern-residential-neighborhood'
  | 'local-commercial-street'
  | 'cafe-front'
  | 'parking-lot'
  | 'neighborhood-park'
  | 'fitness-walkway'
  | 'car-interior'
  | 'beside-parked-car'
  | 'living-room-center'
  | 'by-window'
  | 'in-front-of-tv'
  | 'beside-bed'
  | 'bed-edge'
  | 'wardrobe-front'
  | 'with-laptop'
  | 'beside-weights'
  | 'mirror-area'
  | 'equipment-area';

export const SUB_SCENE_LABELS: Readonly<Record<SubSceneId, string>> = Object.freeze({
  'military-office': 'مكتب إداري عسكري',
  'building-corridor': 'ممرات المبنى',
  'sector-emblem-wall': 'أمام لوحة شعار القطاع',
  'sector-parking': 'مواقف سيارات القطاع',
  'residential-villa-street': 'شارع فلل سكني',
  'modern-residential-neighborhood': 'حي سكني حديث',
  'local-commercial-street': 'شارع تجاري محلي',
  'cafe-front': 'أمام مقهى',
  'parking-lot': 'موقف سيارات',
  'neighborhood-park': 'حديقة حي عامة',
  'fitness-walkway': 'ممشى رياضي',
  'car-interior': 'داخل السيارة',
  'beside-parked-car': 'بجانب السيارة متوقفة',
  'living-room-center': 'في منتصف الصالة',
  'by-window': 'بجانب النافذة',
  'in-front-of-tv': 'أمام التلفاز',
  'beside-bed': 'بجانب السرير',
  'bed-edge': 'على حافة السرير',
  'wardrobe-front': 'أمام الدولاب',
  'with-laptop': 'مع اللابتوب',
  'beside-weights': 'بجانب الأثقال',
  'mirror-area': 'أمام المرآة',
  'equipment-area': 'في منطقة الأجهزة'
});

const SUB_SCENE_BY_LABEL = new Map<string, SubSceneId>(
  Object.entries(SUB_SCENE_LABELS).map(([id, label]) => [label, id as SubSceneId])
);

export const isSubSceneId = (value: unknown): value is SubSceneId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(SUB_SCENE_LABELS, value);

export const resolveSubSceneId = (value: unknown): SubSceneId | '' => {
  if (value === '') return '';
  if (isSubSceneId(value)) return value;
  return typeof value === 'string' ? (SUB_SCENE_BY_LABEL.get(value) ?? '') : '';
};

export const getSubSceneLabel = (id: SubSceneId | ''): string =>
  id ? SUB_SCENE_LABELS[id] : '';
