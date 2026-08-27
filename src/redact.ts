import { analyze } from './analyze.js';
import { parseLog } from './validation.js';
import type { BugBundle, ExportOptions, JsonValue, OperationLog, RedactionOptions, RedactionResult } from './types.js';

function matches(rule: string, segments: string[]): boolean {
  const normalized = rule.trim().replace(/^changes\./, '').replace(/^metadata\./, '');
  if (!normalized) return false;
  if (!normalized.includes('.') && !normalized.includes('*')) return segments.at(-1) === normalized;
  const parts = normalized.split('.');
  const walk = (ruleIndex: number, pathIndex: number): boolean => {
    if (ruleIndex === parts.length) return pathIndex === segments.length;
    if (parts[ruleIndex] === '**') return walk(ruleIndex + 1, pathIndex) || (pathIndex < segments.length && walk(ruleIndex, pathIndex + 1));
    return pathIndex < segments.length && (parts[ruleIndex] === '*' || parts[ruleIndex] === segments[pathIndex]) && walk(ruleIndex + 1, pathIndex + 1);
  };
  return walk(0, 0) || (parts[0] === '**' && walk(0, 0));
}

function scrub(value: JsonValue, rules: string[], replacement: string, path: string[], found: string[]): JsonValue {
  if (Array.isArray(value)) return value.map((item, index) => scrub(item, rules, replacement, [...path, String(index)], found));
  if (value !== null && typeof value === 'object') {
    const result: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      const childPath = [...path, key];
      if (rules.some((rule) => matches(rule, childPath))) {
        result[key] = replacement;
        found.push(childPath.join('.'));
      } else result[key] = scrub(child, rules, replacement, childPath, found);
    }
    return result;
  }
  return value;
}

export function redactLog(input: OperationLog | unknown, options: RedactionOptions): RedactionResult {
  const log = parseLog(input);
  const replacement = options.replacement ?? '[REDACTED]';
  const rules = options.paths.map((path) => path.trim()).filter(Boolean);
  const found: string[] = [];
  const redacted = structuredClone(log);
  redacted.operations = redacted.operations.map((operation) => ({
    ...operation,
    changes: scrub(operation.changes, rules, replacement, [], found) as Record<string, JsonValue>,
    ...(operation.metadata ? { metadata: scrub(operation.metadata, rules, replacement, [], found) as Record<string, JsonValue> } : {})
  }));
  return { log: redacted, redactionCount: found.length, redactedPaths: [...new Set(found)].sort() };
}

export function exportBugBundle(input: OperationLog | unknown, options: ExportOptions): BugBundle {
  const replacement = options.redact.replacement ?? '[REDACTED]';
  const result = redactLog(input, options.redact);
  return {
    format: 'sync-conflict-lens-bundle',
    version: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    notes: options.notes ?? '',
    log: result.log,
    analysis: analyze(result.log),
    redaction: {
      rules: options.redact.paths.map((path) => path.trim()).filter(Boolean),
      replacement,
      count: result.redactionCount,
      paths: result.redactedPaths
    }
  };
}

export function stringifyBugBundle(bundle: BugBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
