import { getActivityLabel, type ActivityId } from '../data/activities';

interface BottomActionBarProps {
  hasScene: boolean;
  sceneLabel: string | null;
  activity: ActivityId | '';
  onSavePreset: () => void;
  onRandomize: () => void;
  onShowPrompt: () => void;
}

export function BottomActionBar({
  hasScene,
  sceneLabel,
  activity,
  onSavePreset,
  onRandomize,
  onShowPrompt
}: BottomActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-[var(--bg-main)]/95 backdrop-blur-md border-t border-[var(--border)] pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
      {hasScene && (
        <div className="flex justify-between items-center mb-3 px-1">
          <div className="text-xs text-[var(--text-muted)] truncate">
            {sceneLabel} • {getActivityLabel(activity)}
          </div>
          <button
            onClick={onSavePreset}
            aria-label="حفظ كقالب"
            className="text-xs text-[var(--accent)] font-medium hover:text-[#e0c496] flex items-center gap-1 focus-ring rounded p-1 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            حفظ كقالب
          </button>
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={onRandomize}
          className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 focus-ring transition-colors"
        >
          عشوائي
        </button>
        <button
          disabled={!hasScene}
          onClick={onShowPrompt}
          className="flex-[2] py-3.5 rounded-xl bg-[var(--accent)] text-black text-sm font-bold shadow-[0_0_15px_rgba(198,168,117,0.2)] hover:bg-[#d6b783] disabled:opacity-50 focus-ring transition-colors"
        >
          عرض البرومبت
        </button>
      </div>
    </div>
  );
}
