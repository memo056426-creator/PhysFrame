import type { LightingKind, LightingSuggestion } from '../engine/lighting';
import type { SceneState, TimeOfDay } from '../types/scene';

interface LightingSectionProps {
  state: SceneState;
  lightingSuggestions: LightingSuggestion[];
  compatibleLightingSuggestions: LightingSuggestion[];
  smartDayLabel: string;
  onSmartLightingPeriod: (period: 'day' | 'night') => void;
  onTimeSelection: (timeOfDay: TimeOfDay) => void;
  onLightingModeChange: (lightingMode: LightingKind) => void;
}

const TIME_OPTIONS: Array<{ id: TimeOfDay; label: string }> = [
  { id: 'morning', label: 'صباح' },
  { id: 'midday', label: 'ظهر' },
  { id: 'afternoon', label: 'عصر' },
  { id: 'sunset', label: 'غروب' },
  { id: 'night', label: 'ليل' }
];

export function LightingSection({
  state,
  lightingSuggestions,
  compatibleLightingSuggestions,
  smartDayLabel,
  onSmartLightingPeriod,
  onTimeSelection,
  onLightingModeChange
}: LightingSectionProps) {
  return (
    <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-medium text-sm text-[var(--text-muted)]">الوقت والإضاءة الفيزيائية</h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-4">يقرأ المكان والفرع والنشاط ثم يرتب المصادر الممكنة بدون إضاءة استوديو وهمية.</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">ذكي</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => onSmartLightingPeriod('day')}
          className={`p-3 rounded-xl border text-right transition-colors focus-ring ${state.timeOfDay !== 'night' ? 'bg-amber-400/10 border-amber-300/30 text-amber-100' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}
        >
          <span className="block text-sm font-medium">☀️ نهار ذكي</span>
          <span className="block text-[10px] opacity-70 mt-1">يقترح: {smartDayLabel}</span>
        </button>
        <button
          onClick={() => onSmartLightingPeriod('night')}
          className={`p-3 rounded-xl border text-right transition-colors focus-ring ${state.timeOfDay === 'night' ? 'bg-indigo-400/10 border-indigo-300/30 text-indigo-100' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}
        >
          <span className="block text-sm font-medium">🌙 ليل ذكي</span>
          <span className="block text-[10px] opacity-70 mt-1">مصادر عملية حقيقية</span>
        </button>
      </div>

      <label className="text-[11px] text-[var(--text-muted)] block mb-2">تحديد الوقت يدويًا</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {TIME_OPTIONS.map(time => (
          <button
            key={time.id}
            onClick={() => onTimeSelection(time.id)}
            className={`px-3 py-1.5 rounded-lg text-sm border focus-ring transition-colors ${state.timeOfDay === time.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}
          >
            {time.label}
          </button>
        ))}
      </div>

      {lightingSuggestions.length > 0 && (
        <div className="mb-4">
          <label className="text-[11px] text-[var(--text-muted)] block mb-2">مقترحة لهذا المشهد</label>
          <div className="space-y-2">
            {lightingSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.kind}
                onClick={() => onLightingModeChange(suggestion.kind)}
                className={`w-full text-right p-3 rounded-xl border transition-colors focus-ring ${state.lightingMode === suggestion.kind ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40' : 'bg-black/10 border-[var(--border)] hover:bg-white/5'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{suggestion.labelAR}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${index === 0 ? 'bg-[var(--accent)] text-black' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                    {index === 0 ? '★ الأفضل' : index === 1 ? 'مناسب جدًا' : 'متوافق'}
                  </span>
                </div>
                <span className="block text-[10px] leading-4 text-[var(--text-muted)] mt-1">{suggestion.reasonAR}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] text-[var(--text-muted)] block mb-1">كل الإضاءات الفيزيائية المتوافقة</label>
        <select
          value={state.lightingMode}
          onChange={event => onLightingModeChange(event.target.value as LightingKind)}
          className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm appearance-none focus-ring"
        >
          {compatibleLightingSuggestions.map(item => (
            <option key={item.kind} value={item.kind}>{item.labelAR}</option>
          ))}
        </select>
      </div>
    </section>
  );
}
