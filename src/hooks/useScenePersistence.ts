import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_STATE } from '../state/sceneState';
import {
  clearCurrentSceneState,
  loadCurrentSceneState,
  saveCurrentSceneState
} from '../storage/appStorage';
import type { SceneState } from '../types/scene';

export function useScenePersistence(
  state: SceneState,
  setState: Dispatch<SetStateAction<SceneState>>
) {
  const [isHydrated, setIsHydrated] = useState(false);

  const hydrateSceneState = useCallback(() => {
    const savedState = loadCurrentSceneState(localStorage);
    if (savedState) setState(savedState);
    return savedState;
  }, [setState]);

  const completeHydration = useCallback(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      saveCurrentSceneState(localStorage, state);
    } catch (error) {
      console.warn('Could not persist PhysFrame state', error);
    }
  }, [state, isHydrated]);

  const resetSceneState = useCallback(() => {
    setState(DEFAULT_STATE);
    clearCurrentSceneState(localStorage);
  }, [setState]);

  return {
    hydrateSceneState,
    completeHydration,
    resetSceneState
  };
}
