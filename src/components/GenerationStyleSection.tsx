import type { RealismStyle } from '../types/scene';

interface GenerationStyleSectionProps {
  realismStyle: RealismStyle;
  onRealismStyleChange: (realismStyle: RealismStyle) => void;
}

export function GenerationStyleSection({
  realismStyle,
  onRealismStyleChange
}: GenerationStyleSectionProps) {
  return (
    <section>
      <h3 className="font-medium mb-3">نمط محرك التوليد</h3>
      <div className="flex justify-between items-center p-1 bg-white/5 rounded-xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--accent)]">
        <select
          value={realismStyle}
          onChange={event => onRealismStyleChange(event.target.value as RealismStyle)}
          className="w-full bg-transparent text-[var(--accent)] text-sm outline-none rounded p-3 font-bold cursor-pointer"
        >
          <option value="anti-ai-raw">خام مضاد للاكتشاف 🚀 (موصى به)</option>
          <option value="raw-candid">واقعي طبيعي</option>
          <option value="cinematic-realism">واقعي سينمائي (قد يبدو AI)</option>
        </select>
      </div>
    </section>
  );
}
