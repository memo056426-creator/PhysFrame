import { SCENE_FAMILIES, VIBE_PRESETS } from '../data/sceneOptions';
import { getSubSceneLabel, type SubSceneId } from '../data/subScenes';
import type { VibePreset } from '../data/sceneOptions';
import type { SceneState } from '../types/scene';

interface ActiveSceneBasicsSectionProps {
  state: SceneState;
  onVibePreset: (preset: VibePreset) => void;
  onChangeLocation: () => void;
  onSubSceneChange: (subScene: SubSceneId) => void;
  onActivityChange: (activity: string) => void;
  onPoseChange: (pose: string) => void;
}

export function ActiveSceneBasicsSection({
  state,
  onVibePreset,
  onChangeLocation,
  onSubSceneChange,
  onActivityChange,
  onPoseChange
}: ActiveSceneBasicsSectionProps) {
  if (!state.sceneFamily) return null;

  const activeFamily = SCENE_FAMILIES[state.sceneFamily];

  return (
    <>
      <section className="bg-gradient-to-r from-[var(--accent)]/10 to-transparent p-4 rounded-2xl border border-[var(--accent)]/20">
        <h3 className="font-bold text-[var(--accent)] text-sm mb-3">⚡ أجواء سريعة</h3>
        <div className="grid grid-cols-2 gap-2">
          {VIBE_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onVibePreset(preset)}
              className="py-3 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-xl text-sm border border-[var(--border)] transition-colors focus-ring text-right"
            >
              <span className="text-lg ml-2">{preset.icon}</span>
              {preset.labelAR}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-lg text-[var(--accent)]">{activeFamily.labelAR}</h3>
          <button
            onClick={onChangeLocation}
            className="text-xs text-[var(--text-muted)] underline decoration-white/20 underline-offset-4 focus-ring rounded p-1 hover:text-white transition-colors"
          >
            تغيير المكان
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFamily.subScenes.map(sub => (
            <button
              key={sub}
              onClick={() => onSubSceneChange(sub)}
              className={`px-4 py-2 rounded-xl text-sm transition-colors border focus-ring ${state.subScene === sub ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}`}
            >
              {getSubSceneLabel(sub)}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-medium mb-3">النشاط والوضعية</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {activeFamily.activities.map(activity => (
            <button
              key={activity}
              onClick={() => onActivityChange(activity)}
              className={`py-2 px-3 rounded-xl text-sm border text-center focus-ring transition-colors ${state.activity === activity ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}
            >
              {activity}
            </button>
          ))}
        </div>
        <select
          value={state.pose}
          onChange={event => onPoseChange(event.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm appearance-none focus-ring"
        >
          {activeFamily.poses.map(pose => (
            <option key={pose} value={pose}>{pose}</option>
          ))}
        </select>
      </section>
    </>
  );
}
