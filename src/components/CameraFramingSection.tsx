import {
  FREE_HAND_POSE_OPTIONS,
  SELFIE_POSE_OPTIONS,
  type FreeHandPoseId,
  type SelfiePoseModifierId
} from '../data/selfiePoses';
import type {
  CameraAngle,
  CaptureType,
  Framing,
  FramingImperfection,
  GroupSelfieCompanionCount,
  SceneState
} from '../types/scene';

interface CameraFramingSectionProps {
  state: SceneState;
  onCaptureTypeChange: (captureType: CaptureType) => void;
  onFramingChange: (framing: Framing) => void;
  onCameraAngleChange: (cameraAngle: CameraAngle) => void;
  onSelfiePoseModifierChange: (modifier: SelfiePoseModifierId) => void;
  onFreeHandPoseChange: (pose: FreeHandPoseId) => void;
  onGroupSelfieEnabledChange: (enabled: boolean) => void;
  onGroupSelfieCompanionCountChange: (count: GroupSelfieCompanionCount) => void;
  onFramingImperfectionChange: (imperfection: FramingImperfection) => void;
  onDigitalZoomChange: (enabled: boolean) => void;
}

const CAPTURE_TYPES: Array<{ id: CaptureType; label: string }> = [
  { id: 'front-selfie', label: 'سيلفي أمامي' },
  { id: 'mirror-selfie', label: 'سيلفي مرآة' },
  { id: 'third-person-candid', label: 'تصوير من شخص آخر' }
];

const FRAMINGS: Array<{ id: Framing; label: string }> = [
  { id: 'head-shoulders', label: 'الرأس والكتف' },
  { id: 'chest-up', label: 'الصدر للأعلى' },
  { id: 'half-body', label: 'نصف الجسم' }
];

export function CameraFramingSection({
  state,
  onCaptureTypeChange,
  onFramingChange,
  onCameraAngleChange,
  onSelfiePoseModifierChange,
  onFreeHandPoseChange,
  onGroupSelfieEnabledChange,
  onGroupSelfieCompanionCountChange,
  onFramingImperfectionChange,
  onDigitalZoomChange
}: CameraFramingSectionProps) {
  const freeHandBlocked = state.handProp !== 'none';

  return (
    <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
      <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">إعدادات الكاميرا والكادر</h3>

      <div className="flex gap-2 mb-2">
        {CAPTURE_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => onCaptureTypeChange(type.id)}
            className={`flex-1 py-2 rounded-lg text-xs border focus-ring transition-colors ${state.captureType === type.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)] font-medium' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}
          >
            {type.label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-[10px] text-[var(--text-muted)]">
        نوع التصوير اختيار ثابت ولا تغيّره الأجواء السريعة أو زر العشوائي.
      </p>

      <div className="flex gap-2 mb-3">
        {FRAMINGS.map(framing => (
          <button
            key={framing.id}
            onClick={() => onFramingChange(framing.id)}
            className={`flex-1 py-2 rounded-lg text-[11px] border focus-ring transition-colors ${state.framing === framing.id ? 'bg-white/10 border-white/20 text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}
          >
            {framing.label}
          </button>
        ))}
      </div>

      <select
        value={state.cameraAngle}
        onChange={event => onCameraAngleChange(event.target.value as CameraAngle)}
        className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring"
      >
        <option value="eye-level">زاوية: مستوى العين</option>
        <option value="slightly-high">زاوية: أعلى قليلًا</option>
        <option value="slightly-low">زاوية: أسفل قليلًا</option>
        <option value="slightly-off-center">زاوية: خارج المنتصف</option>
      </select>

      {state.captureType === 'front-selfie' && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-[var(--border)] bg-black/10 p-3 space-y-3">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">وضعية الجسم والرأس في السيلفي</label>
              <select
                value={state.selfiePoseModifier}
                onChange={event => onSelfiePoseModifierChange(event.target.value as SelfiePoseModifierId)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring"
              >
                {SELFIE_POSE_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>{option.labelAR}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">وضعية اليد الحرة</label>
              <select
                value={state.freeHandPose}
                onChange={event => onFreeHandPoseChange(event.target.value as FreeHandPoseId)}
                disabled={freeHandBlocked}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {FREE_HAND_POSE_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>{option.labelAR}</option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                {freeHandBlocked
                  ? 'اليد الحرة تتبع العنصر المحمول الحالي، لذلك هذا الخيار متوقف مؤقتًا.'
                  : 'تُطبّق على اليد غير المستخدمة في حمل هاتف التصوير فقط.'}
              </p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 bg-black/10 border border-[var(--border)] rounded-xl px-3 py-2.5 cursor-pointer">
            <div>
              <span className="text-xs font-medium block">سيلفي جماعي</span>
              <span className="text-[10px] text-[var(--text-muted)]">الموضوع الرئيسي هو المصوّر، مع منع استنساخ وجوه المرافقين</span>
            </div>
            <input
              type="checkbox"
              checked={state.groupSelfieEnabled}
              onChange={event => onGroupSelfieEnabledChange(event.target.checked)}
              className="w-5 h-5 accent-[var(--accent)]"
            />
          </label>

          {state.groupSelfieEnabled && (
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">عدد المرافقين</label>
              <select
                value={state.groupSelfieCompanionCount}
                onChange={event => onGroupSelfieCompanionCountChange(Number(event.target.value) as GroupSelfieCompanionCount)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring"
              >
                <option value={1}>شخص واحد معي</option>
                <option value={2}>شخصان معي</option>
                <option value={3}>ثلاثة أشخاص معي</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <label className="text-[11px] text-[var(--text-muted)] block mb-1">عدم مثالية التأطير</label>
        <select
          value={state.framingImperfection}
          onChange={event => onFramingImperfectionChange(event.target.value as FramingImperfection)}
          className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring"
        >
          <option value="perfect">تأطير مثالي</option>
          <option value="dutch-angle">ميلان عشوائي</option>
          <option value="awkward-crop">تأطير سيء للرأس</option>
        </select>
      </div>

      {state.captureType === 'third-person-candid' && (
        <label className="mt-3 flex items-center justify-between gap-3 bg-black/10 border border-[var(--border)] rounded-xl px-3 py-2.5 cursor-pointer">
          <span className="text-xs">استخدام تقريب رقمي للهاتف</span>
          <input
            type="checkbox"
            checked={state.useDigitalZoom}
            onChange={event => onDigitalZoomChange(event.target.checked)}
            className="w-5 h-5 accent-[var(--accent)]"
          />
        </label>
      )}
    </section>
  );
}
