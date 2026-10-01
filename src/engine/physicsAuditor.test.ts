import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../state/sceneState';
import type { PromptIR } from './promptIR';
import { auditPromptPhysics } from './physicsAuditor';
import { buildSceneFacts } from './sceneFacts';

const makeIR = (overrides: Partial<Record<PromptIR['sections'][number]['id'], string>> = {}): PromptIR => ({
  sections: [
    { id: 'identity', title: 'SUBJECT & IDENTITY', text: overrides.identity ?? 'Preserve exact identity.', priority: 'hard' },
    { id: 'scene', title: 'SCENE & ACTION', text: overrides.scene ?? 'Ordinary room. Standing naturally.', priority: 'derived' },
    { id: 'attire', title: 'ATTIRE', text: overrides.attire ?? 'Cotton shirt and trousers.', priority: 'derived' },
    {
      id: 'camera',
      title: 'CAMERA & LIGHTING',
      text: overrides.camera ?? 'Smartphone front-camera selfie. Distance: 50 cm. The camera arm remains anatomically plausible. Ordinary available light.',
      priority: 'hard'
    },
    { id: 'texture', title: 'TEXTURE DETAILS', text: overrides.texture ?? 'Raw skin and natural hair.', priority: 'soft' }
  ],
  constraints: [],
  negatives: [],
  warnings: [],
  conflicts: []
});

describe('physics and spatial auditor', () => {
  it('does not invent a critical problem for a physically anchored front selfie', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'bedroom',
      captureType: 'front-selfie'
    });
    const report = auditPromptPhysics(makeIR(), facts);

    expect(report.findings.some(finding => finding.code === 'camera.front-selfie-underconstrained-geometry')).toBe(false);
    expect(report.hasCritical).toBe(false);
  });

  it('flags front-selfie geometry that lacks reachable distance and arm mechanics', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'bedroom',
      captureType: 'front-selfie'
    });
    const report = auditPromptPhysics(makeIR({
      camera: 'Smartphone front-camera selfie. Chest-up framing. Eye-level camera.'
    }), facts);

    expect(report.hasCritical).toBe(true);
    expect(report.findings).toContainEqual(expect.objectContaining({
      code: 'camera.front-selfie-underconstrained-geometry',
      severity: 'p0',
      domain: 'camera'
    }));
  });

  it('flags active secondary lighting inside phone-screen-only mode', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'bedroom',
      captureType: 'front-selfie',
      lightingMode: 'phone-screen',
      timeOfDay: 'night'
    });
    const report = auditPromptPhysics(makeIR({
      camera: 'Smartphone front-camera selfie. Distance: 50 cm. Arm geometry remains plausible. Phone screen is the sole source, with a softbox providing fill light.'
    }), facts);

    expect(report.findings).toContainEqual(expect.objectContaining({
      code: 'lighting.sole-source-causality-leak',
      severity: 'p0',
      domain: 'lighting'
    }));
  });

  it('flags a seated body with no load-bearing seat relationship', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'living-room',
      captureType: 'third-person-candid'
    });
    const report = auditPromptPhysics(makeIR({
      camera: 'Third-person candid photograph.',
      scene: 'The subject is seated on a sofa with a neutral expression.'
    }), facts);

    expect(report.findings).toContainEqual(expect.objectContaining({
      code: 'physics.seated-support-underconstrained',
      severity: 'p1',
      domain: 'physics'
    }));
  });

  it('flags multi-furniture inventory when no relational layout is defined', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'living-room',
      captureType: 'third-person-candid'
    });
    const report = auditPromptPhysics(makeIR({
      camera: 'Third-person candid photograph.',
      scene: 'Visible furniture: sofa, armchair, coffee table, side table.'
    }), facts);

    expect(report.findings).toContainEqual(expect.objectContaining({
      code: 'spatial.multi-furniture-layout-underconstrained',
      severity: 'p1',
      domain: 'spatial'
    }));
  });

  it('does not flag the same furniture inventory once spatial anchors are explicit', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'living-room',
      captureType: 'third-person-candid'
    });
    const report = auditPromptPhysics(makeIR({
      camera: 'Third-person candid photograph.',
      scene: 'The sofa is centered against the back wall. A coffee table is parallel to it. One armchair sits to the right of the sofa.'
    }), facts);

    expect(report.findings.some(finding => finding.code === 'spatial.multi-furniture-layout-underconstrained')).toBe(false);
  });

  it('flags missing LHD seat-to-steering-wheel geometry for a typed driver scene', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'car',
      activity: 'parked-behind-wheel',
      captureType: 'front-selfie'
    });
    const report = auditPromptPhysics(makeIR({
      scene: 'The subject is seated inside a parked car.',
      camera: 'Smartphone front-camera selfie. Distance: 50 cm. Arm geometry remains plausible.'
    }), facts);

    expect(report.findings).toContainEqual(expect.objectContaining({
      code: 'spatial.driver-cabin-axis-underconstrained',
      severity: 'p0'
    }));
  });
});
