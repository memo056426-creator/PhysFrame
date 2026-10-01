export type PromptTab = 'chatgpt' | 'gemini';

interface PromptSheetProps {
  activeTab: PromptTab;
  chatGPTPrompt: string;
  geminiPrompt: string;
  onActiveTabChange: (tab: PromptTab) => void;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export function PromptSheet({
  activeTab,
  chatGPTPrompt,
  geminiPrompt,
  onActiveTabChange,
  onClose,
  onCopy
}: PromptSheetProps) {
  const activePrompt = activeTab === 'chatgpt' ? chatGPTPrompt : geminiPrompt;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-[var(--bg-card)] w-full h-[85vh] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={() => onActiveTabChange('chatgpt')}
              className={`text-sm font-medium pb-1 border-b-2 focus-ring ${
                activeTab === 'chatgpt'
                  ? 'border-[var(--accent)] text-white'
                  : 'border-transparent text-[var(--text-muted)]'
              }`}
            >
              ChatGPT
            </button>
            <button
              onClick={() => onActiveTabChange('gemini')}
              className={`text-sm font-medium pb-1 border-b-2 focus-ring ${
                activeTab === 'gemini'
                  ? 'border-[var(--accent)] text-white'
                  : 'border-transparent text-[var(--text-muted)]'
              }`}
            >
              Gemini
            </button>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="text-[var(--text-muted)] p-2 hover:bg-white/10 rounded-full focus-ring transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 relative" dir="ltr">
          <textarea
            readOnly
            className="w-full h-full bg-transparent text-[var(--text-main)] text-[13px] leading-relaxed resize-none focus-ring rounded-lg p-2 font-mono"
            value={activePrompt}
          />
        </div>

        <div className="p-5 border-t border-white/5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => onCopy(activePrompt)}
            className="w-full py-3.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium flex items-center justify-center gap-2 focus-ring transition-colors"
          >
            <span>نسخ البرومبت</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
