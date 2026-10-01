import React, { useState, useEffect } from 'react';
import { getCompatibleLightingSuggestions, getSmartDayTime, getSmartLightingSuggestions } from './engine/lighting';
import { buildPromptText } from './engine/promptText';
import { resolveSceneConflicts } from './engine/rules';
import { buildSmartComposition } from './engine/smartComposition';
import { deriveRealismState } from './engine/realismState';
import { buildSemanticScene } from './engine/semanticScene';
import { DEFAULT_STATE } from './state/sceneState';

import { sanitizeReferenceImage } from './engine/referenceImage';
import { deleteImageFromDB, loadImageFromDB, saveImageToDB } from './storage/referenceImageStorage';
import { clearCurrentSceneState, loadCurrentSceneState, loadSavedPresets, saveCurrentSceneState, saveSavedPresets } from './storage/appStorage';
import { addSavedPreset, removeSavedPreset } from './state/presets';
import { OUTFITS } from './data/outfits';
import { EXPRESSIONS, FACIAL_HAIR_STATES, FLASH_MODES, GAZE_DIRECTIONS, HAND_PROPS, HAIRSTYLES, SCENE_FAMILIES, VIBE_PRESETS } from './data/sceneOptions';
import type { VibePreset } from './data/sceneOptions';
import { ReferenceImageSection } from './components/ReferenceImageSection';

import type {
  AtmosphericCondition,
  BackgroundDynamics,
  CameraAngle,
  CaptureType,
  ClothingCondition,
  FacialHairState,
  FlashMode,
  ForegroundObstruction,
  Framing,
  FramingImperfection,
  GazeDirection,
  GroupSelfieCompanionCount,
  HandProp,
  LensCondition,
  RealismStyle,
  SavedPreset,
  SceneFamilyId,
  SceneState,
  TimeOfDay
} from './types/scene';

// --- MAIN REACT APPLICATION ---

export default function PhysFrameApp() {
  const [state, setState] = useState<SceneState>(DEFAULT_STATE);
  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'gemini'>('chatgpt');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasReference, setHasReference] = useState<boolean>(false);
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [showPresetsSheet, setShowPresetsSheet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedState = loadCurrentSceneState(localStorage);
        if (savedState) setState(savedState);
        const savedPresets = loadSavedPresets(localStorage);
        if (savedPresets.length) setPresets(savedPresets);
        const blob = await loadImageFromDB();
        if (blob) {
          try {
            const safeBlob = await sanitizeReferenceImage(blob);
            await saveImageToDB(safeBlob);
            setImageUrl(URL.createObjectURL(safeBlob));
            setHasReference(true);
          } catch (error) {
            console.warn('Discarded an unsafe or unsupported stored reference image.', error);
            await deleteImageFromDB();
          }
        }
      } catch (e) { console.error('Failed to load local data', e); }
      setIsLoaded(true);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try { saveCurrentSceneState(localStorage, state); }
    catch (error) { console.warn('Could not persist PhysFrame state', error); }
  }, [state, isLoaded]);
  useEffect(() => { return () => { if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl); }; }, [imageUrl]);

  const activeFamily = state.sceneFamily ? SCENE_FAMILIES[state.sceneFamily] : null;

  const lightingSuggestions = state.sceneFamily
    ? getSmartLightingSuggestions({
        sceneFamily: state.sceneFamily,
        subScene: state.subScene,
        timeOfDay: state.timeOfDay,
        activity: state.activity
      }, 4)
    : [];
  const compatibleLightingSuggestions = state.sceneFamily
    ? getCompatibleLightingSuggestions({
        sceneFamily: state.sceneFamily,
        subScene: state.subScene,
        timeOfDay: state.timeOfDay,
        activity: state.activity
      })
    : [];
  const smartDayTime = state.sceneFamily ? getSmartDayTime(state.sceneFamily, state.subScene) : 'midday';
  const smartDayLabel = smartDayTime === 'morning' ? 'صباح' : smartDayTime === 'afternoon' ? 'عصر' : 'ظهر';

  const handleTimeSelection = (timeOfDay: TimeOfDay) => {
    setState(current => {
      if (!current.sceneFamily) return { ...current, timeOfDay };
      const allCompatible = getCompatibleLightingSuggestions({
        sceneFamily: current.sceneFamily,
        subScene: current.subScene,
        timeOfDay,
        activity: current.activity
      });
      const currentStillValid = allCompatible.some(item => item.labelAR === current.lightingMode);
      return {
        ...current,
        timeOfDay,
        lightingMode: currentStillValid ? current.lightingMode : (allCompatible[0]?.labelAR ?? current.lightingMode)
      };
    });
  };

  const handleSmartLightingPeriod = (period: 'day' | 'night') => {
    setState(current => {
      if (!current.sceneFamily) return current;
      const timeOfDay: TimeOfDay = period === 'night'
        ? 'night'
        : getSmartDayTime(current.sceneFamily, current.subScene);
      const suggested = getSmartLightingSuggestions({
        sceneFamily: current.sceneFamily,
        subScene: current.subScene,
        timeOfDay,
        activity: current.activity
      }, 1)[0];
      return { ...current, timeOfDay, lightingMode: suggested?.labelAR ?? current.lightingMode };
    });
  };

  useEffect(() => {
    if (!state.sceneFamily) return;
    const resolved = resolveSceneConflicts(state, SCENE_FAMILIES[state.sceneFamily]);
    if (JSON.stringify(resolved) !== JSON.stringify(state)) setState(resolved);
  }, [state.sceneFamily, state.subScene, state.activity, state.pose, state.lightingMode, state.timeOfDay, state.captureType, state.foregroundObstruction, state.atmosphericCondition, state.hasGlasses, state.handProp, state.environmentRealism, state.groupSelfieEnabled]);

  const handleSceneSelect = (familyId: SceneFamilyId) => {
    const family = SCENE_FAMILIES[familyId];
    setState({ ...state, sceneFamily: familyId, subScene: family.subScenes[0], activity: family.activities[0], pose: family.poses[0], lightingMode: family.allowedLighting[0], environmentRealism: family.environmentRealism[0] });
  };

  const handleSmartComposition = () => {
    setState(current => buildSmartComposition(current, SCENE_FAMILIES));
  };

  const handleVibePreset = (preset: VibePreset) => setState({ ...state, ...preset.state, outfitId: state.outfitId, hairStyle: state.hairStyle });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let safeImage: Blob;
    try {
      safeImage = await sanitizeReferenceImage(file);
    } catch (error) {
      console.warn('Rejected unsafe or unsupported reference image.', error);
      e.currentTarget.value = '';
      return;
    }

    try {
      await saveImageToDB(safeImage);
    } catch (error) {
      console.warn('Could not persist reference image in IndexedDB; using session preview only.', error);
    }

    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(safeImage));
    setHasReference(true);
    setState(prev => ({ ...prev, referenceImageId: file.name }));
  };

  const handleImageDelete = async () => {
    try {
      await deleteImageFromDB();
    } catch (error) {
      console.warn('Could not remove reference image from IndexedDB.', error);
    }

    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setHasReference(false);
    setState(prev => ({ ...prev, referenceImageId: null }));
  };

  const handleSavePreset = () => {
    const updatedPresets = addSavedPreset(presets, state);
    if (updatedPresets === presets) return;
    setPresets(updatedPresets); saveSavedPresets(localStorage, updatedPresets);
  };
  
  const deletePreset = (id: string) => {
    const updated = removeSavedPreset(presets, id);
    setPresets(updated); saveSavedPresets(localStorage, updated);
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  let chatGPTPrompt = "", geminiPrompt = "";
  if (state.sceneFamily) {
    const derived = deriveRealismState(state);
    const semantic = buildSemanticScene(state, derived);
    chatGPTPrompt = buildPromptText(semantic, 'chatgpt', state);
    geminiPrompt = buildPromptText(semantic, 'gemini', state);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans pb-24 selection:bg-[var(--accent)] selection:text-black">
      <style>{`
        :root { --bg-main: #111315; --bg-card: #181B1E; --bg-hover: #202428; --text-main: #F3EFE7; --text-muted: #A7A39A; --accent: #C6A875; --border: rgba(255, 255, 255, 0.08); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .focus-ring:focus { outline: none; box-shadow: 0 0 0 2px var(--accent); }
      `}</style>

      <div className="max-w-md mx-auto bg-[var(--bg-main)] min-h-screen relative shadow-2xl overflow-hidden">
        <header className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg-main)]/90 backdrop-blur z-20">
          <div>
            <h1 className="text-xl font-bold tracking-wide">PhysFrame</h1>
            <p className="text-xs text-[var(--text-muted)]">محرك البرومبت الواقعي</p>
          </div>
          <div className="flex gap-3">
             <button aria-label="القوالب المحفوظة" className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors" onClick={() => setShowPresetsSheet(true)}>القوالب</button>
             <button aria-label="إعادة ضبط الإعدادات" className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors" onClick={() => {setState(DEFAULT_STATE); clearCurrentSceneState(localStorage);}}>إعادة ضبط</button>
          </div>
        </header>

        <ReferenceImageSection
          hasReference={hasReference}
          imageUrl={imageUrl}
          hasGlasses={state.hasGlasses}
          onImageUpload={handleImageUpload}
          onImageDelete={handleImageDelete}
          onGlassesChange={hasGlasses => setState(current => ({ ...current, hasGlasses }))}
        />

        <div className="px-5 py-2">
          {!state.sceneFamily ? (
             <div className="py-10 text-center animate-fade-in">
                <h2 className="text-xl font-bold mb-6">أين تريد التصوير؟</h2>
                <div className="flex flex-col gap-3">
                  {Object.entries(SCENE_FAMILIES).map(([id, family]) => (
                    <button key={id} onClick={() => handleSceneSelect(id as SceneFamilyId)} className="w-full py-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] text-lg hover:bg-[var(--bg-hover)] transition-colors focus-ring">
                      {family.labelAR}
                    </button>
                  ))}
                </div>
             </div>
          ) : (
             <div className="animate-fade-in space-y-8 pb-10">
                <section className="bg-gradient-to-r from-[var(--accent)]/10 to-transparent p-4 rounded-2xl border border-[var(--accent)]/20">
                  <h3 className="font-bold text-[var(--accent)] text-sm mb-3">⚡ أجواء سريعة</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {VIBE_PRESETS.map(preset => (
                      <button key={preset.id} onClick={() => handleVibePreset(preset)} className="py-3 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-xl text-sm border border-[var(--border)] transition-colors focus-ring text-right">
                        <span className="text-lg ml-2">{preset.icon}</span>{preset.labelAR}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-lg text-[var(--accent)]">{activeFamily?.labelAR}</h3>
                    <button onClick={() => setState({...state, sceneFamily: null})} className="text-xs text-[var(--text-muted)] underline decoration-white/20 underline-offset-4 focus-ring rounded p-1 hover:text-white transition-colors">تغيير المكان</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeFamily?.subScenes.map(sub => (
                       <button key={sub} onClick={() => setState({...state, subScene: sub})} className={`px-4 py-2 rounded-xl text-sm transition-colors border focus-ring ${state.subScene === sub ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}`}>
                         {sub}
                       </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="font-medium mb-3">النشاط والوضعية</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {activeFamily?.activities.map(act => (
                       <button key={act} onClick={() => setState({...state, activity: act})} className={`py-2 px-3 rounded-xl text-sm border text-center focus-ring transition-colors ${state.activity === act ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>
                         {act}
                       </button>
                    ))}
                  </div>
                  <select value={state.pose} onChange={e => setState({...state, pose: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm appearance-none focus-ring">
                    {activeFamily?.poses.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </section>

                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
                  <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">الخلفية والبيئة</h3>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1">حركة الخلفية</label>
                  <select value={state.backgroundDynamics} onChange={e => setState({...state, backgroundDynamics: e.target.value as BackgroundDynamics})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm appearance-none focus-ring">
                    <option value="empty">فارغة وهادئة</option>
                    <option value="casual">عابرون غير مبالين</option>
                    <option value="busy">مزدحمة وحركية</option>
                  </select>
                </section>

                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
                   <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">إعدادات الكاميرا والكادر</h3>
                   <div className="flex gap-2 mb-3">
                      {[{id:'front-selfie', l:'أمامية'}, {id:'mirror-selfie', l:'مرآة'}, {id:'third-person-candid', l:'عفوية'}].map(t => (
                        <button key={t.id} onClick={() => setState({...state, captureType: t.id as CaptureType, groupSelfieEnabled: t.id === 'front-selfie' ? state.groupSelfieEnabled : false})} className={`flex-1 py-2 rounded-lg text-xs border focus-ring transition-colors ${state.captureType === t.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)] font-medium' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
                      ))}
                   </div>
                   <div className="flex gap-2 mb-3">
                      {[{id:'head-shoulders', l:'الرأس والكتف'}, {id:'chest-up', l:'الصدر للأعلى'}, {id:'half-body', l:'نصف الجسم'}].map(t => (
                        <button key={t.id} onClick={() => setState({...state, framing: t.id as Framing})} className={`flex-1 py-2 rounded-lg text-[11px] border focus-ring transition-colors ${state.framing === t.id ? 'bg-white/10 border-white/20 text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
                      ))}
                   </div>
                   <select value={state.cameraAngle} onChange={e => setState({...state, cameraAngle: e.target.value as CameraAngle})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring">
                    <option value="eye-level">زاوية: مستوى العين</option>
                    <option value="slightly-high">زاوية: أعلى قليلًا</option>
                    <option value="slightly-low">زاوية: أسفل قليلًا</option>
                    <option value="slightly-off-center">زاوية: خارج المنتصف</option>
                  </select>
                  {state.captureType === 'front-selfie' && (
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center justify-between gap-3 bg-black/10 border border-[var(--border)] rounded-xl px-3 py-2.5 cursor-pointer">
                        <div>
                          <span className="text-xs font-medium block">سيلفي جماعي</span>
                          <span className="text-[10px] text-[var(--text-muted)]">الموضوع الرئيسي هو المصوّر، مع منع استنساخ وجوه المرافقين</span>
                        </div>
                        <input type="checkbox" checked={state.groupSelfieEnabled} onChange={e => setState({...state, groupSelfieEnabled: e.target.checked})} className="w-5 h-5 accent-[var(--accent)]" />
                      </label>
                      {state.groupSelfieEnabled && (
                        <div>
                          <label className="text-[11px] text-[var(--text-muted)] block mb-1">عدد المرافقين</label>
                          <select value={state.groupSelfieCompanionCount} onChange={e => setState({...state, groupSelfieCompanionCount: Number(e.target.value) as GroupSelfieCompanionCount})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring">
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
                    <select value={state.framingImperfection} onChange={e => setState({...state, framingImperfection: e.target.value as FramingImperfection})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm appearance-none focus-ring">
                      <option value="perfect">تأطير مثالي</option>
                      <option value="dutch-angle">ميلان عشوائي</option>
                      <option value="awkward-crop">تأطير سيء للرأس</option>
                    </select>
                  </div>
                  {state.captureType === 'third-person-candid' && (
                    <label className="mt-3 flex items-center justify-between gap-3 bg-black/10 border border-[var(--border)] rounded-xl px-3 py-2.5 cursor-pointer">
                      <span className="text-xs">استخدام تقريب رقمي للهاتف</span>
                      <input type="checkbox" checked={state.useDigitalZoom} onChange={e => setState({...state, useDigitalZoom: e.target.checked})} className="w-5 h-5 accent-[var(--accent)]" />
                    </label>
                  )}
                </section>

                <section>
                   <h3 className="font-medium mb-3">الملابس والشخصية</h3>
                   <select value={state.outfitId} onChange={e => setState({...state, outfitId: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm appearance-none focus-ring mb-3 text-white">
                     {OUTFITS.map(o => <option key={o.id} value={o.id}>{o.labelAR}</option>)}
                   </select>
                   <div className="grid grid-cols-2 gap-3">
                     <select value={state.hairStyle} onChange={e => setState({...state, hairStyle: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                       {HAIRSTYLES.map(h => <option key={h.id} value={h.id}>{h.labelAR}</option>)}
                     </select>
                     <select value={state.expression} onChange={e => setState({...state, expression: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                       {EXPRESSIONS.map(e => <option key={e.id} value={e.id}>{e.labelAR}</option>)}
                     </select>
                   </div>
                </section>

                <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">
                   <div className="flex items-center gap-2 mb-4">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                     <h3 className="font-bold text-[var(--accent)] text-sm tracking-wide">تفاصيل واقعية متقدمة</h3>
                   </div>
                   <div className="space-y-3">
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">اتجاه النظر</label>
                       <select value={state.gazeDirection} onChange={e => setState({...state, gazeDirection: e.target.value as GazeDirection})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {GAZE_DIRECTIONS.map(g => <option key={g.id} value={g.id}>{g.labelAR}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">مقتنيات اليد</label>
                       <select value={state.handProp} onChange={e => setState({...state, handProp: e.target.value as HandProp})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {HAND_PROPS.filter(p => state.hasGlasses || p.id !== 'adjusting-glasses').map(p => <option key={p.id} value={p.id}>{p.labelAR}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة اللحية</label>
                       <select value={state.facialHairState} onChange={e => setState({...state, facialHairState: e.target.value as FacialHairState})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {FACIAL_HAIR_STATES.map(f => <option key={f.id} value={f.id}>{f.labelAR}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">وضع الفلاش (يكسر مظهر AI)</label>
                       <select value={state.flashMode} onChange={e => setState({...state, flashMode: e.target.value as FlashMode})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         {FLASH_MODES.map(f => <option key={f.id} value={f.id}>{f.labelAR}</option>)}
                       </select>
                     </div>
                   </div>
                </section>

                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
                   <div className="flex items-start justify-between gap-3 mb-3">
                     <div>
                       <h3 className="font-medium text-sm text-[var(--text-muted)]">الوقت والإضاءة الفيزيائية</h3>
                       <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-4">يقرأ المكان والفرع والنشاط ثم يرتب المصادر الممكنة بدون إضاءة استوديو وهمية.</p>
                     </div>
                     <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">ذكي</span>
                   </div>

                   <div className="grid grid-cols-2 gap-2 mb-4">
                     <button onClick={() => handleSmartLightingPeriod('day')} className={`p-3 rounded-xl border text-right transition-colors focus-ring ${state.timeOfDay !== 'night' ? 'bg-amber-400/10 border-amber-300/30 text-amber-100' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>
                       <span className="block text-sm font-medium">☀️ نهار ذكي</span>
                       <span className="block text-[10px] opacity-70 mt-1">يقترح: {smartDayLabel}</span>
                     </button>
                     <button onClick={() => handleSmartLightingPeriod('night')} className={`p-3 rounded-xl border text-right transition-colors focus-ring ${state.timeOfDay === 'night' ? 'bg-indigo-400/10 border-indigo-300/30 text-indigo-100' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>
                       <span className="block text-sm font-medium">🌙 ليل ذكي</span>
                       <span className="block text-[10px] opacity-70 mt-1">مصادر عملية حقيقية</span>
                     </button>
                   </div>

                   <label className="text-[11px] text-[var(--text-muted)] block mb-2">تحديد الوقت يدويًا</label>
                   <div className="flex flex-wrap gap-2 mb-4">
                      {[{id:'morning', l:'صباح'}, {id:'midday', l:'ظهر'}, {id:'afternoon', l:'عصر'}, {id:'sunset', l:'غروب'}, {id:'night', l:'ليل'}].map(t => (
                        <button key={t.id} onClick={() => handleTimeSelection(t.id as TimeOfDay)} className={`px-3 py-1.5 rounded-lg text-sm border focus-ring transition-colors ${state.timeOfDay === t.id ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}>{t.l}</button>
                      ))}
                   </div>

                   {lightingSuggestions.length > 0 && (
                     <div className="mb-4">
                       <label className="text-[11px] text-[var(--text-muted)] block mb-2">مقترحة لهذا المشهد</label>
                       <div className="space-y-2">
                         {lightingSuggestions.map((suggestion, index) => (
                           <button key={suggestion.labelAR} onClick={() => setState({...state, lightingMode: suggestion.labelAR})} className={`w-full text-right p-3 rounded-xl border transition-colors focus-ring ${state.lightingMode === suggestion.labelAR ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40' : 'bg-black/10 border-[var(--border)] hover:bg-white/5'}`}>
                             <div className="flex items-center justify-between gap-2">
                               <span className="text-xs font-medium">{suggestion.labelAR}</span>
                               <span className={`text-[9px] px-2 py-0.5 rounded-full ${index === 0 ? 'bg-[var(--accent)] text-black' : 'bg-white/5 text-[var(--text-muted)]'}`}>{index === 0 ? '★ الأفضل' : index === 1 ? 'مناسب جدًا' : 'متوافق'}</span>
                             </div>
                             <span className="block text-[10px] leading-4 text-[var(--text-muted)] mt-1">{suggestion.reasonAR}</span>
                           </button>
                         ))}
                       </div>
                     </div>
                   )}

                   <div>
                     <label className="text-[11px] text-[var(--text-muted)] block mb-1">كل الإضاءات الفيزيائية المتوافقة</label>
                     <select value={state.lightingMode} onChange={e => setState({...state, lightingMode: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm appearance-none focus-ring">
                       {compatibleLightingSuggestions.map(item => <option key={item.labelAR} value={item.labelAR}>{item.labelAR}</option>)}
                     </select>
                   </div>
                </section>

                <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">
                   <div className="flex items-center gap-2 mb-4">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                     <h3 className="font-bold text-[var(--accent)] text-sm tracking-wide">العيوب والعشوائية <span className="text-[10px] font-normal opacity-80">(لخداع الـ AI)</span></h3>
                   </div>
                   <div className="space-y-3">
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة العدسة (Lens)</label>
                       <select value={state.lensCondition} onChange={e => setState({...state, lensCondition: e.target.value as LensCondition})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="modern-iphone">عدسة نظيفة (آيفون حديث)</option>
                         <option value="budget-android">معالجة رديئة (أندرويد اقتصادي)</option>
                         <option value="smudged-lens">عدسة متسخة (توهج وضبابية)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">حالة القماش والتجاعيد</label>
                       <select value={state.clothingCondition} onChange={e => setState({...state, clothingCondition: e.target.value as ClothingCondition})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="crisp">مرتب ومكوي (مثالي)</option>
                         <option value="worn-all-day">ملبوس طوال اليوم (طيات واقعية)</option>
                         <option value="vintage-washed">قديم ومغسول (باهت ومتآكل)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">الجو والمحيط</label>
                       <select value={state.atmosphericCondition} onChange={e => setState({...state, atmosphericCondition: e.target.value as AtmosphericCondition})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="neutral">طبيعي</option>
                         <option value="high-humidity">رطوبة/صيف (تعرق البشرة)</option>
                         <option value="dusty-haze">غبار/عج (تباين منخفض)</option>
                         <option value="breezy">هواء متحرك (للشعر والملابس)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[11px] text-[var(--text-muted)] block mb-1">المشتتات البصرية (Foreground)</label>
                       <select value={state.foregroundObstruction} onChange={e => setState({...state, foregroundObstruction: e.target.value as ForegroundObstruction})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm appearance-none focus-ring">
                         <option value="clean">كادر نظيف بالكامل</option>
                         <option value="through-glass">من خلف زجاج (انعكاسات)</option>
                         <option value="foreground-clutter">عنصر مشتت قريب من العدسة</option>
                       </select>
                     </div>
                   </div>
                </section>

                <section>
                   <h3 className="font-medium mb-3">نمط محرك التوليد</h3>
                   <div className="flex justify-between items-center p-1 bg-white/5 rounded-xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--accent)]">
                      <select value={state.realismStyle} onChange={e => setState({...state, realismStyle: e.target.value as RealismStyle})} className="w-full bg-transparent text-[var(--accent)] text-sm outline-none rounded p-3 font-bold cursor-pointer">
                         <option value="anti-ai-raw">خام مضاد للاكتشاف 🚀 (موصى به)</option>
                         <option value="raw-candid">واقعي طبيعي</option>
                         <option value="cinematic-realism">واقعي سينمائي (قد يبدو AI)</option>
                      </select>
                   </div>
                </section>
             </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-[var(--bg-main)]/95 backdrop-blur-md border-t border-[var(--border)] pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
           {state.sceneFamily && (
             <div className="flex justify-between items-center mb-3 px-1">
               <div className="text-xs text-[var(--text-muted)] truncate">{activeFamily?.labelAR} • {state.activity}</div>
               <button onClick={handleSavePreset} aria-label="حفظ كقالب" className="text-xs text-[var(--accent)] font-medium hover:text-[#e0c496] flex items-center gap-1 focus-ring rounded p-1 transition-colors">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                 حفظ كقالب
               </button>
             </div>
           )}
           <div className="flex gap-3">
             <button onClick={handleSmartComposition} className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 focus-ring transition-colors">عشوائي</button>
             <button disabled={!state.sceneFamily} onClick={() => setShowPromptSheet(true)} className="flex-[2] py-3.5 rounded-xl bg-[var(--accent)] text-black text-sm font-bold shadow-[0_0_15px_rgba(198,168,117,0.2)] hover:bg-[#d6b783] disabled:opacity-50 focus-ring transition-colors">عرض البرومبت</button>
           </div>
        </div>

        {showPromptSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPromptSheet(false)}></div>
            <div className="relative bg-[var(--bg-card)] w-full h-[85vh] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]">
               <div className="p-4 border-b border-white/5 flex justify-between items-center">
                  <div className="flex gap-4">
                     <button onClick={() => setActiveTab('chatgpt')} className={`text-sm font-medium pb-1 border-b-2 focus-ring ${activeTab==='chatgpt' ? 'border-[var(--accent)] text-white' : 'border-transparent text-[var(--text-muted)]'}`}>ChatGPT</button>
                     <button onClick={() => setActiveTab('gemini')} className={`text-sm font-medium pb-1 border-b-2 focus-ring ${activeTab==='gemini' ? 'border-[var(--accent)] text-white' : 'border-transparent text-[var(--text-muted)]'}`}>Gemini</button>
                  </div>
                  <button onClick={() => setShowPromptSheet(false)} aria-label="إغلاق" className="text-[var(--text-muted)] p-2 hover:bg-white/10 rounded-full focus-ring transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-5 relative" dir="ltr">
                  <textarea readOnly className="w-full h-full bg-transparent text-[var(--text-main)] text-[13px] leading-relaxed resize-none focus-ring rounded-lg p-2 font-mono" value={activeTab === 'chatgpt' ? chatGPTPrompt : geminiPrompt}/>
               </div>
               <div className="p-5 border-t border-white/5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                  <button onClick={() => copyToClipboard(activeTab === 'chatgpt' ? chatGPTPrompt : geminiPrompt)} className="w-full py-3.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium flex items-center justify-center gap-2 focus-ring transition-colors">
                    <span>نسخ البرومبت</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
               </div>
            </div>
          </div>
        )}

        {showPresetsSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPresetsSheet(false)}></div>
            <div className="relative bg-[var(--bg-card)] w-full max-h-[70vh] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]">
               <div className="p-5 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-lg font-bold">القوالب المحفوظة</h3>
                  <button onClick={() => setShowPresetsSheet(false)} aria-label="إغلاق" className="text-[var(--text-muted)] p-2 hover:bg-white/10 rounded-full focus-ring transition-colors">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-5">
                  {presets.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-10 text-sm">لا يوجد قوالب محفوظة حالياً.</div>
                  ) : (
                    <div className="space-y-3">
                      {presets.map(preset => (
                        <div key={preset.id} className="bg-[var(--bg-hover)] border border-white/5 p-4 rounded-xl flex justify-between items-center focus-within:ring-2 focus-within:ring-[var(--accent)]">
                           <div className="flex-1 cursor-pointer outline-none" tabIndex={0} onClick={() => {setState(preset.state); setShowPresetsSheet(false);}}>
                             <h4 className="font-medium text-sm mb-1">{preset.name}</h4>
                             <p className="text-xs text-[var(--text-muted)]">{preset.state.captureType} • {preset.state.subScene}</p>
                           </div>
                           <button onClick={() => deletePreset(preset.id)} aria-label="حذف" className="text-red-400/70 p-3 hover:bg-white/5 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
