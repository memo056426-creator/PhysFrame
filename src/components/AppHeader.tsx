interface AppHeaderProps {
  onOpenPresets: () => void;
  onReset: () => void;
}

export function AppHeader({ onOpenPresets, onReset }: AppHeaderProps) {
  return (
    <header className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg-main)]/90 backdrop-blur z-20">
      <div>
        <h1 className="text-xl font-bold tracking-wide">PhysFrame</h1>
        <p className="text-xs text-[var(--text-muted)]">محرك البرومبت الواقعي</p>
      </div>
      <div className="flex gap-3">
        <button
          aria-label="القوالب المحفوظة"
          className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors"
          onClick={onOpenPresets}
        >
          القوالب
        </button>
        <button
          aria-label="إعادة ضبط الإعدادات"
          className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors"
          onClick={onReset}
        >
          إعادة ضبط
        </button>
      </div>
    </header>
  );
}
