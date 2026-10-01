import { OUTFITS } from '../data/outfits';
import { EXPRESSIONS, HAIRSTYLES } from '../data/sceneOptions';
import type { SceneState } from '../types/scene';

interface AppearanceSectionProps {
  state: SceneState;
  onOutfitChange: (outfitId: string) => void;
  onHairStyleChange: (hairStyle: string) => void;
  onExpressionChange: (expression: string) => void;
}

export function AppearanceSection({
  state,
  onOutfitChange,
  onHairStyleChange,
  onExpressionChange
}: AppearanceSectionProps) {
  return (
    <section>
      <h3 className="font-medium mb-3">الملابس والشخصية</h3>
      <select
        value={state.outfitId}
        onChange={event => onOutfitChange(event.target.value)}
        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm appearance-none focus-ring mb-3 text-white"
      >
        {OUTFITS.map(outfit => (
          <option key={outfit.id} value={outfit.id}>{outfit.labelAR}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={state.hairStyle}
          onChange={event => onHairStyleChange(event.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
        >
          {HAIRSTYLES.map(hairStyle => (
            <option key={hairStyle.id} value={hairStyle.id}>{hairStyle.labelAR}</option>
          ))}
        </select>
        <select
          value={state.expression}
          onChange={event => onExpressionChange(event.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
        >
          {EXPRESSIONS.map(expression => (
            <option key={expression.id} value={expression.id}>{expression.labelAR}</option>
          ))}
        </select>
      </div>
    </section>
  );
}
