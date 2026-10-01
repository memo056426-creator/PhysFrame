import { SCENE_FAMILIES } from '../data/sceneOptions';
import type { SceneFamilyId } from '../types/scene';

interface SceneSelectionSectionProps {
  onSelect: (familyId: SceneFamilyId) => void;
}

export function SceneSelectionSection({ onSelect }: SceneSelectionSectionProps) {
  return (
    <div className="py-10 text-center animate-fade-in">
      <h2 className="text-xl font-bold mb-6">أين تريد التصوير؟</h2>
      <div className="flex flex-col gap-3">
        {Object.entries(SCENE_FAMILIES).map(([id, family]) => (
          <button
            key={id}
            onClick={() => onSelect(id as SceneFamilyId)}
            className="w-full py-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] text-lg hover:bg-[var(--bg-hover)] transition-colors focus-ring"
          >
            {family.labelAR}
          </button>
        ))}
      </div>
    </div>
  );
}
