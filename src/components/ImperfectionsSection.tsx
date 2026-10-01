import type {
  AtmosphericCondition,
  ClothingCondition,
  ForegroundObstruction,
  LensCondition,
  SceneState
} from '../types/scene';

interface ImperfectionsSectionProps {
  state: SceneState;
  onLensConditionChange: (lensCondition: LensCondition) => void;
  onClothingConditionChange: (clothingCondition: ClothingCondition) => void;
  onAtmosphericConditionChange: (atmosphericCondition: AtmosphericCondition) => void;
  onForegroundObstructionChange: (foregroundObstruction: ForegroundObstruction) => void;
}

export function ImperfectionsSection({
  state,
  onLensConditionChange,
  onClothingConditionChange,
  onAtmosphericConditionChange,
  onForegroundObstructionChange
}: ImperfectionsSectionProps) {
  return (
    <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">
      <div className="flex items-center gap-2 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <h3 className="font-bold text-[var(--accent)] text-sm tracking-wide">
          العيوب والعشوائية <span className="text-[10px] font-normal opacity-80">(لخداع الـ AI)</span>
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة العدسة (Lens)</label>
          <select
            value={state.lensCondition}
            onChange={event => onLensConditionChange(event.target.value as LensCondition)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            <option value="modern-iphone">عدسة نظيفة (آيفون حديث)</option>
            <option value="budget-android">معالجة رديئة (أندرويد اقتصادي)</option>
            <option value="smudged-lens">عدسة متسخة (توهج وضبابية)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة القماش والتجاعيد</label>
          <select
            value={state.clothingCondition}
            onChange={event => onClothingConditionChange(event.target.value as ClothingCondition)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            <option value="crisp">مرتب ومكوي (مثالي)</option>
            <option value="worn-all-day">ملبوس طوال اليوم (طيات واقعية)</option>
            <option value="vintage-washed">قديم ومغسول (باهت ومتآكل)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">الجو والمحيط</label>
          <select
            value={state.atmosphericCondition}
            onChange={event => onAtmosphericConditionChange(event.target.value as AtmosphericCondition)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            <option value="neutral">طبيعي</option>
            <option value="high-humidity">رطوبة/صيف (تعرق البشرة)</option>
            <option value="dusty-haze">غبار/عج (تباين منخفض)</option>
            <option value="breezy">هواء متحرك (للشعر والملابس)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">المشتتات البصرية (Foreground)</label>
          <select
            value={state.foregroundObstruction}
            onChange={event => onForegroundObstructionChange(event.target.value as ForegroundObstruction)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            <option value="clean">كادر نظيف بالكامل</option>
            <option value="through-glass">من خلف زجاج (انعكاسات)</option>
            <option value="foreground-clutter">عنصر مشتت قريب من العدسة</option>
          </select>
        </div>
      </div>
    </section>
  );
}
