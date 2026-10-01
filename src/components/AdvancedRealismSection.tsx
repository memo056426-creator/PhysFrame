import { FACIAL_HAIR_STATES, FLASH_MODES, GAZE_DIRECTIONS, HAND_PROPS } from '../data/sceneOptions';
import type { FacialHairState, FlashMode, GazeDirection, HandProp, SceneState } from '../types/scene';

interface AdvancedRealismSectionProps {
  state: SceneState;
  onGazeDirectionChange: (gazeDirection: GazeDirection) => void;
  onHandPropChange: (handProp: HandProp) => void;
  onFacialHairStateChange: (facialHairState: FacialHairState) => void;
  onFlashModeChange: (flashMode: FlashMode) => void;
}

export function AdvancedRealismSection({
  state,
  onGazeDirectionChange,
  onHandPropChange,
  onFacialHairStateChange,
  onFlashModeChange
}: AdvancedRealismSectionProps) {
  return (
    <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">
      <div className="flex items-center gap-2 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
        <h3 className="font-bold text-[var(--accent)] text-sm tracking-wide">تفاصيل واقعية متقدمة</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">اتجاه النظر</label>
          <select
            value={state.gazeDirection}
            onChange={event => onGazeDirectionChange(event.target.value as GazeDirection)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            {GAZE_DIRECTIONS.map(gaze => (
              <option key={gaze.id} value={gaze.id}>{gaze.labelAR}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">مقتنيات اليد</label>
          <select
            value={state.handProp}
            onChange={event => onHandPropChange(event.target.value as HandProp)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            {HAND_PROPS.filter(prop => state.hasGlasses || prop.id !== 'adjusting-glasses').map(prop => (
              <option key={prop.id} value={prop.id}>{prop.labelAR}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة اللحية</label>
          <select
            value={state.facialHairState}
            onChange={event => onFacialHairStateChange(event.target.value as FacialHairState)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            {FACIAL_HAIR_STATES.map(facialHair => (
              <option key={facialHair.id} value={facialHair.id}>{facialHair.labelAR}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1">وضع الفلاش (يكسر مظهر AI)</label>
          <select
            value={state.flashMode}
            onChange={event => onFlashModeChange(event.target.value as FlashMode)}
            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring"
          >
            {FLASH_MODES.map(flash => (
              <option key={flash.id} value={flash.id}>{flash.labelAR}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
