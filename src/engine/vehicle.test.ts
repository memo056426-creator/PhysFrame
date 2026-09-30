import { describe, expect, it } from 'vitest';
import { buildVehicleGeometry, resolveVehicleRole } from './vehicle';

const carEnvironment = 'Location: ordinary realistic السيارة setting.';

describe('vehicle geometry', () => {
  it('locks the parked driver to the front-left seat of an LHD cabin', () => {
    const profile = buildVehicleGeometry({
      visibleEnvironment: carEnvironment,
      poseAndContact: 'Pose: جالس باسترخاء في المقعد. Activity: خلف المقود والسيارة متوقفة.'
    });

    expect(profile.role).toBe('driver');
    expect(profile.sceneGeometry).toContain("FRONT-LEFT DRIVER'S SEAT");
    expect(profile.sceneGeometry).toContain('LEFT-HAND-DRIVE');
    expect(profile.sceneGeometry).toContain("center console and front-passenger seat are to the subject's right");
    expect(profile.hardConstraints.some(item => item.includes("steering wheel MUST remain centered directly in front"))).toBe(true);
    expect(profile.negativeConstraints).toContain('right-hand-drive cabin');
  });

  it('does not apply driver locks to the passenger activity', () => {
    const profile = buildVehicleGeometry({
      visibleEnvironment: carEnvironment,
      poseAndContact: 'Pose: جالس باسترخاء في المقعد. Activity: جالس في مقعد الراكب.'
    });

    expect(profile.role).toBe('front-passenger');
    expect(profile.sceneGeometry).toBe('');
    expect(profile.hardConstraints).toHaveLength(0);
    expect(profile.negativeConstraints).toHaveLength(0);
  });

  it('recognizes the generic inside-car activity without inventing a driver role', () => {
    expect(resolveVehicleRole({
      visibleEnvironment: carEnvironment,
      poseAndContact: 'Activity: جالس بهدوء داخل السيارة.'
    })).toBe('generic-front-seat');
  });

  it('ignores identical activity text outside a car scene', () => {
    expect(resolveVehicleRole({
      visibleEnvironment: 'Location: ordinary realistic غرفة نوم setting.',
      poseAndContact: 'Activity: خلف المقود والسيارة متوقفة.'
    })).toBe('none');
  });
});
