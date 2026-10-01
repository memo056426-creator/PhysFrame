import { useRef, type ChangeEventHandler } from 'react';
import { REFERENCE_IMAGE_ACCEPT } from '../engine/referenceImage';

interface ReferenceImageSectionProps {
  hasReference: boolean;
  imageUrl: string | null;
  hasGlasses: boolean;
  onImageUpload: ChangeEventHandler<HTMLInputElement>;
  onImageDelete: () => void | Promise<void>;
  onGlassesChange: (hasGlasses: boolean) => void;
}

export function ReferenceImageSection({
  hasReference,
  imageUrl,
  hasGlasses,
  onImageUpload,
  onImageDelete,
  onGlassesChange
}: ReferenceImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async () => {
    await onImageDelete();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="px-5 py-4">
      <h2 className="text-sm font-semibold mb-3 text-[var(--text-muted)]">الصورة المرجعية</h2>
      {!hasReference ? (
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 flex flex-col items-center justify-center border border-dashed border-[var(--border)] text-center animate-fade-in">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-[var(--text-muted)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p className="text-sm font-medium mb-1">لم يتم تحديد صورة مرجعية</p>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 mt-2 bg-[var(--accent)] text-black text-sm font-medium rounded-lg focus-ring hover:bg-[#d6b783] transition-colors">رفع صورة</button>
          <input type="file" ref={fileInputRef} onChange={onImageUpload} accept={REFERENCE_IMAGE_ACCEPT} className="hidden" />
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-2xl p-3 flex gap-4 items-center border border-[var(--border)] animate-fade-in">
          <div className="w-16 h-20 bg-[var(--bg-hover)] rounded-xl overflow-hidden relative shrink-0 flex items-center justify-center">
            <span className="text-2xl absolute opacity-50">👤</span>
            <img src={imageUrl || ''} alt="Reference" className="w-full h-full object-cover opacity-80 relative z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#7CB68B]"></span>
              <span className="text-sm font-medium">الهوية مثبتة</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-white/70 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md transition-colors focus-ring">استبدال</button>
              <button onClick={handleDelete} className="text-[11px] text-red-400/70 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400">حذف</button>
              <input type="file" ref={fileInputRef} onChange={onImageUpload} accept={REFERENCE_IMAGE_ACCEPT} className="hidden" />
            </div>
          </div>
        </div>
      )}
      <label className="mt-3 flex items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 cursor-pointer">
        <div>
          <span className="text-sm font-medium block">هل الشخص يرتدي نظارة؟</span>
          <span className="text-[10px] text-[var(--text-muted)]">يُستخدم لتثبيت النظارة وفيزياء العدسات فقط عند التفعيل</span>
        </div>
        <input type="checkbox" checked={hasGlasses} onChange={e => onGlassesChange(e.target.checked)} className="w-5 h-5 accent-[var(--accent)] shrink-0" />
      </label>
    </div>
  );
}
