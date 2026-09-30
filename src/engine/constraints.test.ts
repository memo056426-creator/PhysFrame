import { describe, expect, it } from 'vitest';
import { buildNegativeConstraints } from './constraints';

describe('negative constraint registry', () => {
  it('keeps the original empty-background ban for solo captures', () => {
    const negatives = buildNegativeConstraints({ backgroundDynamics: 'empty', groupSelfieEnabled: false });
    expect(negatives).toContain('background people');
    expect(negatives).toContain('crowd');
  });

  it('does not accidentally ban intended companions in an empty group-selfie background', () => {
    const negatives = buildNegativeConstraints({ backgroundDynamics: 'empty', groupSelfieEnabled: true });
    expect(negatives).not.toContain('background people');
    expect(negatives).not.toContain('crowd');
    expect(negatives).toContain('unrelated background bystanders');
    expect(negatives).toContain('unrelated crowd');
    expect(negatives).toContain('cloned faces');
    expect(negatives).toContain('floating extra hands');
    expect(negatives).toContain('third-person photographer taking group shot');
  });

  it('aggressively blocks lookalike and reference-leakage failure modes in group selfies', () => {
    const negatives = buildNegativeConstraints({ backgroundDynamics: 'casual', groupSelfieEnabled: true });
    expect(negatives).toEqual(expect.arrayContaining([
      'lookalike companions',
      'sibling-like faces',
      'shared facial geometry',
      'repeated jawline',
      'repeated nose shape',
      'repeated eye geometry',
      'facial feature averaging',
      'identity blending',
      'reference-face leakage into companions',
      'same hairline on multiple people',
      'same beard pattern on multiple people'
    ]));
  });
});
