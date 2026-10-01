import type { BackgroundDynamics } from '../types/scene';

interface BackgroundEnvironmentSectionProps {
  backgroundDynamics: BackgroundDynamics;
  onBackgroundDynamicsChange: (backgroundDynamics: BackgroundDynamics) => void;
}

export function BackgroundEnvironmentSection({
  backgroundDynamics,
  onBackgroundDynamicsChange
}: BackgroundEnvironmentSectionProps) {
  return (
    <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
      <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">الخلفية والبيئة</h3>
      <label className="text-[11px] text-[var(--text-muted)] block mb-1">حركة الخلفية</label>
      <select
        value={backgroundDynamics}
        onChange={event => onBackgroundDynamicsChange(event.target.value as BackgroundDynamics)}
        className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm appearance-none focus-ring"
      >
        <option value="empty">فارغة وهادئة</option>
        <option value="casual">عابرون غير مبالين</option>
        <option value="busy">مزدحمة وحركية</option>
      </select>
    </section>
  );
}
