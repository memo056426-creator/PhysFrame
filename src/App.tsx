import React, { useState, useEffect } from 'react';
import { DEFAULT_STATE } from './state/sceneState';
import { useSceneOrchestration } from './hooks/useSceneOrchestration';
import { useReferenceImage } from './hooks/useReferenceImage';

import { clearCurrentSceneState, loadCurrentSceneState, loadSavedPresets, saveCurrentSceneState, saveSavedPresets } from './storage/appStorage';
import { addSavedPreset, removeSavedPreset } from './state/presets';
import { ReferenceImageSection } from './components/ReferenceImageSection';
import { SceneSelectionSection } from './components/SceneSelectionSection';
import { ActiveSceneBasicsSection } from './components/ActiveSceneBasicsSection';
import { CameraFramingSection } from './components/CameraFramingSection';
import { AppearanceSection } from './components/AppearanceSection';
import { AdvancedRealismSection } from './components/AdvancedRealismSection';
import { LightingSection } from './components/LightingSection';
import { ImperfectionsSection } from './components/ImperfectionsSection';
import { GenerationStyleSection } from './components/GenerationStyleSection';
import { BackgroundEnvironmentSection } from './components/BackgroundEnvironmentSection';
import { PromptSheet } from './components/PromptSheet';
import { PresetsSheet } from './components/PresetsSheet';
import { BottomActionBar } from './components/BottomActionBar';
import { AppHeader } from './components/AppHeader';

import type { SavedPreset, SceneState } from './types/scene';

// --- MAIN REACT APPLICATION ---

export default function PhysFrameApp() {
  const [state, setState] = useState<SceneState>(DEFAULT_STATE);
  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'gemini'>('chatgpt');
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [showPresetsSheet, setShowPresetsSheet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const {
    imageUrl,
    hasReference,
    hydrateReferenceImage,
    handleImageUpload,
    handleImageDelete
  } = useReferenceImage(setState);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedState = loadCurrentSceneState(localStorage);
        if (savedState) setState(savedState);
        const savedPresets = loadSavedPresets(localStorage);
        if (savedPresets.length) setPresets(savedPresets);
        await hydrateReferenceImage();
      } catch (e) { console.error('Failed to load local data', e); }
      setIsLoaded(true);
    };
    loadInitialData();
  }, [hydrateReferenceImage]);

  useEffect(() => {
    if (!isLoaded) return;
    try { saveCurrentSceneState(localStorage, state); }
    catch (error) { console.warn('Could not persist PhysFrame state', error); }
  }, [state, isLoaded]);

  const {
    activeFamily,
    lightingSuggestions,
    compatibleLightingSuggestions,
    smartDayLabel,
    handleTimeSelection,
    handleSmartLightingPeriod,
    handleSceneSelect,
    handleSmartComposition,
    handleVibePreset,
    chatGPTPrompt,
    geminiPrompt
  } = useSceneOrchestration(state, setState);

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
        <AppHeader
          onOpenPresets={() => setShowPresetsSheet(true)}
          onReset={() => {
            setState(DEFAULT_STATE);
            clearCurrentSceneState(localStorage);
          }}
        />

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
             <SceneSelectionSection onSelect={handleSceneSelect} />
          ) : (
             <div className="animate-fade-in space-y-8 pb-10">
                <ActiveSceneBasicsSection
                  state={state}
                  onVibePreset={handleVibePreset}
                  onChangeLocation={() => setState(current => ({ ...current, sceneFamily: null }))}
                  onSubSceneChange={subScene => setState(current => ({ ...current, subScene }))}
                  onActivityChange={activity => setState(current => ({ ...current, activity }))}
                  onPoseChange={pose => setState(current => ({ ...current, pose }))}
                />

                <BackgroundEnvironmentSection
                  backgroundDynamics={state.backgroundDynamics}
                  onBackgroundDynamicsChange={backgroundDynamics => setState(current => ({ ...current, backgroundDynamics }))}
                />

                <CameraFramingSection
                  state={state}
                  onCaptureTypeChange={captureType => setState(current => ({
                    ...current,
                    captureType,
                    groupSelfieEnabled: captureType === 'front-selfie' ? current.groupSelfieEnabled : false
                  }))}
                  onFramingChange={framing => setState(current => ({ ...current, framing }))}
                  onCameraAngleChange={cameraAngle => setState(current => ({ ...current, cameraAngle }))}
                  onGroupSelfieEnabledChange={groupSelfieEnabled => setState(current => ({ ...current, groupSelfieEnabled }))}
                  onGroupSelfieCompanionCountChange={groupSelfieCompanionCount => setState(current => ({ ...current, groupSelfieCompanionCount }))}
                  onFramingImperfectionChange={framingImperfection => setState(current => ({ ...current, framingImperfection }))}
                  onDigitalZoomChange={useDigitalZoom => setState(current => ({ ...current, useDigitalZoom }))}
                />

                <AppearanceSection
                  state={state}
                  onOutfitChange={outfitId => setState(current => ({ ...current, outfitId }))}
                  onHairStyleChange={hairStyle => setState(current => ({ ...current, hairStyle }))}
                  onExpressionChange={expression => setState(current => ({ ...current, expression }))}
                />

                <AdvancedRealismSection
                  state={state}
                  onGazeDirectionChange={gazeDirection => setState(current => ({ ...current, gazeDirection }))}
                  onHandPropChange={handProp => setState(current => ({ ...current, handProp }))}
                  onFacialHairStateChange={facialHairState => setState(current => ({ ...current, facialHairState }))}
                  onFlashModeChange={flashMode => setState(current => ({ ...current, flashMode }))}
                />

                <LightingSection
                  state={state}
                  lightingSuggestions={lightingSuggestions}
                  compatibleLightingSuggestions={compatibleLightingSuggestions}
                  smartDayLabel={smartDayLabel}
                  onSmartLightingPeriod={handleSmartLightingPeriod}
                  onTimeSelection={handleTimeSelection}
                  onLightingModeChange={lightingMode => setState(current => ({ ...current, lightingMode }))}
                />

                <ImperfectionsSection
                  state={state}
                  onLensConditionChange={lensCondition => setState(current => ({ ...current, lensCondition }))}
                  onClothingConditionChange={clothingCondition => setState(current => ({ ...current, clothingCondition }))}
                  onAtmosphericConditionChange={atmosphericCondition => setState(current => ({ ...current, atmosphericCondition }))}
                  onForegroundObstructionChange={foregroundObstruction => setState(current => ({ ...current, foregroundObstruction }))}
                />

                <GenerationStyleSection
                  realismStyle={state.realismStyle}
                  onRealismStyleChange={realismStyle => setState(current => ({ ...current, realismStyle }))}
                />
             </div>
          )}
        </div>

        <BottomActionBar
          hasScene={Boolean(state.sceneFamily)}
          sceneLabel={activeFamily?.labelAR ?? null}
          activity={state.activity}
          onSavePreset={handleSavePreset}
          onRandomize={handleSmartComposition}
          onShowPrompt={() => setShowPromptSheet(true)}
        />

        {showPromptSheet && (
          <PromptSheet
            activeTab={activeTab}
            chatGPTPrompt={chatGPTPrompt}
            geminiPrompt={geminiPrompt}
            onActiveTabChange={setActiveTab}
            onClose={() => setShowPromptSheet(false)}
            onCopy={copyToClipboard}
          />
        )}

        {showPresetsSheet && (
          <PresetsSheet
            presets={presets}
            onSelectPreset={preset => { setState(preset.state); setShowPresetsSheet(false); }}
            onDeletePreset={deletePreset}
            onClose={() => setShowPresetsSheet(false)}
          />
        )}
      </div>
    </div>
  );
}
