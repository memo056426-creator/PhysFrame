import type { SceneState } from '../types/scene';

// --- BACKGROUND CROWD DYNAMICS ---
export const resolveBackgroundDynamics = (state: SceneState): { description: string; constraints: string[] } => {
  const mode = state.backgroundDynamics ?? 'empty';
  if (mode === 'empty') {
    return {
      description: 'Calm background with no prominent background people; ordinary environment details and subtle traces of daily life only.',
      constraints: []
    };
  }

  const constraints = [
    'NO background people staring at the camera',
    'NO posed background characters',
    'NO generic stock-photo crowd',
    'NO duplicated people or cloned faces',
    'NO perfectly sharp background faces competing with the main subject'
  ];
  const busy = mode === 'busy';

  if (state.sceneFamily === 'saudi-outdoor') {
    return {
      description: busy
        ? 'Plausibly active pedestrian flow in the background: indifferent passersby minding their own business, some partially occluded and walking away, one distant person may glance down at a phone, with mild motion blur only on genuinely moving figures. No background person engages with the camera.'
        : 'A few indifferent pedestrians in the background minding their own business; one distant person may be looking down at a phone and another partially obscured figure may be walking away. Background people remain naturally small or slightly soft from distance, with zero eye contact toward the camera.',
      constraints
    };
  }

  if (state.sceneFamily === 'military-base') {
    const parking = state.subScene.includes('مواقف');
    return {
      description: busy
        ? (parking
          ? 'Active but believable workplace parking background with uniformed personnel moving between vehicles, some carrying paperwork or small work items, with mild motion blur on brisk movement and casual unposed body language.'
          : 'Candid workplace activity with several uniformed colleagues walking briskly through the corridor or office background, some carrying paperwork, varied unposed stances, and mild motion blur on moving personnel.')
        : (parking
          ? 'One or two uniformed colleagues moving naturally in the parking background, occupied with work or vehicles and not acknowledging the camera.'
          : 'One or two uniformed colleagues in the background continuing ordinary work, walking or handling paperwork in casual unposed stances, without looking at the camera.'),
      constraints
    };
  }

  if (state.sceneFamily === 'gym') {
    return {
      description: busy
        ? 'Multiple gym members at different stages of exercise in the background, with natural overlap between bodies and equipment, one person resting or wiping sweat, and mild motion blur on actively moving limbs. Nobody pauses or poses for the camera.'
        : 'A few gym members naturally mid-workout or resting in the background; one distant person may be wiping sweat or adjusting equipment. Equipment partially occludes bodies in a physically plausible way and nobody looks at the camera.',
      constraints
    };
  }

  if (state.sceneFamily === 'car') {
    const insideCar = state.subScene.includes('داخل');
    return {
      description: insideCar
        ? (busy
          ? 'Passing pedestrians and traffic remain outside the vehicle windows, with physically plausible motion blur from movement and faint reflections on the glass; background figures never appear inside the cabin or acknowledge the camera.'
          : 'An occasional distant pedestrian or passing vehicle may be visible outside the windows, softened by distance and glass, with faint traffic reflections on the window surface and no eye contact toward the camera.')
        : (busy
          ? 'Active but ordinary roadside background with passing pedestrians and traffic, partial occlusion by the parked car, and mild motion blur on moving figures; nobody interacts with the camera.'
          : 'A few indifferent pedestrians or distant road users pass behind the parked car, minding their own business and never looking toward the camera.'),
      constraints
    };
  }

  if (state.sceneFamily === 'living-room') {
    return {
      description: busy
        ? 'Domestic background remains believable rather than crowded: one partially visible household member may cross or occupy an adjacent area, naturally soft or slightly motion-blurred and not facing the camera, with lived-in traces such as a casually placed jacket, cup, cable, or remote.'
        : 'Subtle traces of daily life in the background, such as a casually placed jacket, cup, cable, or remote; if the layout allows, a partially visible household member may appear deep in an adjacent area without looking toward the camera.',
      constraints
    };
  }

  if (state.sceneFamily === 'bedroom') {
    return {
      description: busy
        ? 'Keep the bedroom private and uncrowded: at most one partially visible household member may pass through a doorway or adjacent space if physically visible, never posing or looking at the camera; otherwise use stronger lived-in traces such as a casually discarded jacket, charging cable, book, or folded clothing.'
        : 'No crowd in the bedroom. Prefer believable traces of daily life such as a casually discarded jacket on a chair, charging cable, book, or folded clothing rather than adding unnecessary people.',
      constraints
    };
  }

  return {
    description: busy
      ? 'Background activity should feel naturally busy with unposed people moving independently of the camera and mild motion blur only where movement physically justifies it.'
      : 'A small number of background people may appear incidentally, remaining unposed, occupied with their own activity, and never looking at the camera.',
    constraints
  };
};

