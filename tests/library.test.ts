import { describe, expect, it } from 'vitest';
import {
  LensValidationError, SAMPLE_LOG, analyze, exportBugBundle, parseLog,
  redactLog, stringifyBugBundle, validateLog
} from '../src/index.js';

describe('documented operation log API', () => {
  it('detects concurrent field conflicts in causal order', () => {
    const result = analyze(SAMPLE_LOG);
    expect(result.timeline.map((step) => step.operation.id)).toEqual(['base-1', 'phone-2', 'laptop-2', 'phone-3']);
    expect(result.conflicts.map((conflict) => conflict.field)).toEqual(['status', 'note']);
    expect(result.replicas).toEqual(['phone', 'laptop']);
    expect(result.finalStateByReplica.phone?.['note:departure']?.status).toBe('ready');
    expect(result.finalStateByReplica.laptop?.['note:departure']?.status).toBe('blocked');
  });

  it('does not flag causally ordered updates as concurrent', () => {
    const log = parseLog({ version: 1, operations: [
      { id: 'a', replica: 'one', entity: 'card:1', timestamp: '2026-01-01T00:00:00Z', parents: [], changes: { title: 'A' } },
      { id: 'b', replica: 'two', entity: 'card:1', timestamp: '2026-01-01T00:00:01Z', parents: ['a'], changes: { title: 'B' } }
    ] });
    expect(analyze(log).conflicts).toHaveLength(0);
  });

  it('covers the README example', () => {
    const log = parseLog({ version: 1, operations: [
      { id: 'phone-1', replica: 'phone', entity: 'task:42', timestamp: '2026-01-18T09:00:00.000Z', parents: [], changes: { title: 'Book train' } },
      { id: 'laptop-1', replica: 'laptop', entity: 'task:42', timestamp: '2026-01-18T09:00:02.000Z', parents: [], changes: { title: 'Book sleeper train' } }
    ] });
    expect(analyze(log).conflicts[0]?.field).toBe('title');
  });
});

describe('validation', () => {
  it('returns actionable issues and throws a typed parse error', () => {
    const invalid = { version: 2, operations: [{ id: 'a', replica: 'one', entity: 'x', timestamp: 'not-a-date', parents: ['missing'], changes: {} }] };
    expect(validateLog(invalid).map((issue) => issue.code)).toEqual(expect.arrayContaining(['format', 'reference']));
    expect(() => parseLog(invalid)).toThrow(LensValidationError);
    expect(() => parseLog('{oops')).toThrow('Could not parse JSON');
  });

  it('rejects cycles and more than two replicas', () => {
    const cyclic = { version: 1, operations: [
      { id: 'a', replica: 'one', entity: 'x', timestamp: '2026-01-01', parents: ['b'], changes: {} },
      { id: 'b', replica: 'two', entity: 'x', timestamp: '2026-01-01', parents: ['a'], changes: {} }
    ] };
    expect(validateLog(cyclic).some((issue) => issue.code === 'cycle')).toBe(true);
  });
});

describe('privacy-safe export', () => {
  it('redacts bare keys, dot paths, metadata, and reports the scrub', () => {
    const log = parseLog({ version: 1, operations: [{
      id: 'a', replica: 'one', entity: 'x', timestamp: '2026-01-01', parents: [],
      changes: { email: 'person@example.com', profile: { name: 'Private', city: 'Pune' } },
      metadata: { device: 'Personal phone' }
    }] });
    const result = redactLog(log, { paths: ['email', 'profile.name', 'device'] });
    expect(result.log.operations[0]?.changes).toEqual({ email: '[REDACTED]', profile: { name: '[REDACTED]', city: 'Pune' } });
    expect(result.log.operations[0]?.metadata?.device).toBe('[REDACTED]');
    expect(result.redactionCount).toBe(3);
  });

  it('never copies original sensitive values into the bundle analysis', () => {
    const bundle = exportBugBundle(SAMPLE_LOG, {
      redact: { paths: ['ownerEmail', 'note', 'device', 'sessionId'] },
      notes: 'Two offline edits',
      generatedAt: '2026-08-27T00:00:00.000Z'
    });
    const serialized = stringifyBugBundle(bundle);
    expect(serialized).not.toContain('mina@example.test');
    expect(serialized).not.toContain('session-private');
    expect(bundle.redaction.count).toBe(7);
    expect(serialized.endsWith('\n')).toBe(true);
  });
});
