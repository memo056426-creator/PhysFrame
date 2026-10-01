import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { getCompatibleLightingSuggestions, getSmartDayTime, getSmartLightingSuggestions } from '../engine/lighting';
import type { AuditFinding } from '../engine/physicsAuditor';
import { compilePromptText } from '../engine/promptText';
import { deriveRealismState } from '../engine/realismState';
import { resolveSceneConflicts } from '../engine/rules';
import { buildSemanticScene } from '../engine/semanticScene';
import { buildSmartComposition } from '../engine/smartComposition';
import { SCENE_FAMILIES } from '../data/sceneOptions';
import type { VibePreset } from '../data/sceneOptions';
import type { ValidationIssue } from '../engine/validation';
import type { SceneFamilyId, SceneState, TimeOfDay } from '../types/scene';

export function useSceneOrchestration(
  state: SceneState,
  setState: Dispatch<SetStateAction<SceneState>>
) {
  const activeFamily = state.sceneFamily ? SCENE_FAMILIES[state.sceneFamily] : null;

  const lightingSuggestions = state.sceneFamily
    ? getSmartLightingSuggestions(
        {
          sceneFamily: state.sceneFamily,
          subScene: state.subScene,
          timeOfDay: state.timeOfDay,
          activity: state.activity
        },
        4
      )
    : [];

  const compatibleLightingSuggestions = state.sceneFamily
    ? getCompatibleLightingSuggestions({
        sceneFamily: state.sceneFamily,
        subScene: state.subScene,
        timeOfDay: state.timeOfDay,
        activity: state.activity
      })
    : [];

  const smartDayTime = state.sceneFamily
    ? getSmartDayTime(state.sceneFamily, state.subScene)
    : 'midday';
  const smartDayLabel =
    smartDayTime === 'morning' ? 'صباح' : smartDayTime === 'afternoon' ? 'عصر' : 'ظهر';

  const handleTimeSelection = (timeOfDay: TimeOfDay) => {
    setState(current => {
      if (!current.sceneFamily) return { ...current, timeOfDay };

      const allCompatible = getCompatibleLightingSuggestions({
        sceneFamily: current.sceneFamily,
        subScene: current.subScene,
        timeOfDay,
        activity: current.activity
      });
      const currentStillValid = allCompatible.some(
        item => item.kind === current.lightingMode
      );

      return {
        ...current,
        timeOfDay,
        lightingMode: currentStillValid
          ? current.lightingMode
          : (allCompatible[0]?.kind ?? current.lightingMode)
      };
    });
  };

  const handleSmartLightingPeriod = (period: 'day' | 'night') => {
    setState(current => {
      if (!current.sceneFamily) return current;

      const timeOfDay: TimeOfDay =
        period === 'night' ? 'night' : getSmartDayTime(current.sceneFamily, current.subScene);
      const suggested = getSmartLightingSuggestions(
        {
          sceneFamily: current.sceneFamily,
          subScene: current.subScene,
          timeOfDay,
          activity: current.activity
        },
        1
      )[0];

      return {
        ...current,
        timeOfDay,
        lightingMode: suggested?.kind ?? current.lightingMode
      };
    });
  };

  useEffect(() => {
    if (!state.sceneFamily) return;

    const resolved = resolveSceneConflicts(state, SCENE_FAMILIES[state.sceneFamily]);
    if (JSON.stringify(resolved) !== JSON.stringify(state)) setState(resolved);
  }, [
    state.sceneFamily,
    state.subScene,
    state.activity,
    state.pose,
    state.lightingMode,
    state.timeOfDay,
    state.captureType,
    state.foregroundObstruction,
    state.atmosphericCondition,
    state.hasGlasses,
    state.handProp,
    state.environmentRealism,
    state.groupSelfieEnabled,
    setState
  ]);

  const handleSceneSelect = (familyId: SceneFamilyId) => {
    const family = SCENE_FAMILIES[familyId];
    setState({
      ...state,
      sceneFamily: familyId,
      subScene: family.subScenes[0],
      activity: family.activities[0],
      pose: family.poses[0],
      lightingMode: family.allowedLighting[0],
      environmentRealism: family.environmentRealism[0]
    });
  };

  const handleSmartComposition = () => {
    setState(current => buildSmartComposition(current, SCENE_FAMILIES));
  };

  const handleVibePreset = (preset: VibePreset) => {
    setState({
      ...state,
      ...preset.state,
      outfitId: state.outfitId,
      hairStyle: state.hairStyle
    });
  };

  let chatGPTPrompt = '';
  let geminiPrompt = '';
  let promptBlocked = false;
  let promptValidationIssues: ValidationIssue[] = [];
  let promptAuditFindings: AuditFinding[] = [];

  if (state.sceneFamily) {
    const derived = deriveRealismState(state);
    const semantic = buildSemanticScene(state, derived);
    const chatGPTCompilation = compilePromptText(semantic, 'chatgpt', state);
    const geminiCompilation = compilePromptText(semantic, 'gemini', state);

    chatGPTPrompt = chatGPTCompilation.prompt ?? '';
    geminiPrompt = geminiCompilation.prompt ?? '';
    promptBlocked = chatGPTCompilation.prompt === null || geminiCompilation.prompt === null;
    promptValidationIssues = chatGPTCompilation.validation.issues;
    promptAuditFindings = chatGPTCompilation.audit.findings;
  }

  return {
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
    geminiPrompt,
    promptBlocked,
    promptValidationIssues,
    promptAuditFindings
  };
}
