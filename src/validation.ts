import type { JsonValue, Operation, OperationLog, ValidationIssue } from './types.js';

const MAX_OPERATIONS = 10_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isObject(value) && Object.values(value).every(isJsonValue);
}

export function validateLog(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return [{ path: '$', code: 'type', message: 'Log must be a JSON object.' }];
  if (input.version !== 1) issues.push({ path: 'version', code: 'format', message: 'Version must be 1.' });
  if (!Array.isArray(input.operations)) {
    issues.push({ path: 'operations', code: 'required', message: 'Operations must be an array.' });
    return issues;
  }
  if (input.operations.length === 0) issues.push({ path: 'operations', code: 'required', message: 'Add at least one operation.' });
  if (input.operations.length > MAX_OPERATIONS) issues.push({ path: 'operations', code: 'limit', message: `Logs are limited to ${MAX_OPERATIONS.toLocaleString()} operations in the local viewer.` });

  const ids = new Set<string>();
  const operations: Operation[] = [];
  input.operations.forEach((candidate, index) => {
    const base = `operations[${index}]`;
    if (!isObject(candidate)) {
      issues.push({ path: base, code: 'type', message: 'Operation must be an object.' });
      return;
    }
    for (const key of ['id', 'replica', 'entity', 'timestamp'] as const) {
      if (typeof candidate[key] !== 'string' || candidate[key].trim() === '') {
        issues.push({ path: `${base}.${key}`, code: 'required', message: `${key} must be a non-empty string.` });
      }
    }
    if (typeof candidate.timestamp === 'string' && Number.isNaN(Date.parse(candidate.timestamp))) {
      issues.push({ path: `${base}.timestamp`, code: 'format', message: 'Timestamp must be a valid ISO-style date.' });
    }
    if (!Array.isArray(candidate.parents) || !candidate.parents.every((parent) => typeof parent === 'string')) {
      issues.push({ path: `${base}.parents`, code: 'type', message: 'Parents must be an array of operation IDs.' });
    }
    if (!isObject(candidate.changes) || !isJsonValue(candidate.changes)) {
      issues.push({ path: `${base}.changes`, code: 'type', message: 'Changes must be a JSON object with finite values.' });
    }
    if (candidate.deleted !== undefined && typeof candidate.deleted !== 'boolean') {
      issues.push({ path: `${base}.deleted`, code: 'type', message: 'Deleted must be true or false.' });
    }
    if (candidate.metadata !== undefined && (!isObject(candidate.metadata) || !isJsonValue(candidate.metadata))) {
      issues.push({ path: `${base}.metadata`, code: 'type', message: 'Metadata must be a JSON object.' });
    }
    if (typeof candidate.id === 'string') {
      if (ids.has(candidate.id)) issues.push({ path: `${base}.id`, code: 'duplicate', message: `Operation ID “${candidate.id}” is duplicated.` });
      ids.add(candidate.id);
    }
    if (typeof candidate.id === 'string' && typeof candidate.replica === 'string' && typeof candidate.entity === 'string' && typeof candidate.timestamp === 'string' && Array.isArray(candidate.parents) && isObject(candidate.changes)) {
      operations.push(candidate as unknown as Operation);
    }
  });

  for (const operation of operations) {
    for (const parent of operation.parents) {
      if (!ids.has(parent)) issues.push({ path: `operations.${operation.id}.parents`, code: 'reference', message: `Parent “${parent}” does not exist.` });
      if (parent === operation.id) issues.push({ path: `operations.${operation.id}.parents`, code: 'cycle', message: 'An operation cannot parent itself.' });
    }
  }
  if (!issues.some((issue) => issue.code === 'reference' || issue.code === 'duplicate')) {
    const byId = new Map(operations.map((operation) => [operation.id, operation]));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      const cyclic = (byId.get(id)?.parents ?? []).some(visit);
      visiting.delete(id);
      visited.add(id);
      return cyclic;
    };
    if (operations.some((operation) => visit(operation.id))) issues.push({ path: 'operations', code: 'cycle', message: 'Parent links contain a causal cycle.' });
  }
  const replicas = new Set(operations.map((operation) => operation.replica));
  if (replicas.size > 2) issues.push({ path: 'operations', code: 'limit', message: 'Version 1 accepts at most two replicas per analysis.' });
  return issues;
}

export class LensValidationError extends Error {
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
    this.name = 'LensValidationError';
    this.issues = issues;
  }
}

export function parseLog(input: string | unknown): OperationLog {
  let value: unknown = input;
  if (typeof input === 'string') {
    try { value = JSON.parse(input); }
    catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown JSON error';
      throw new LensValidationError([{ path: '$', code: 'format', message: `Could not parse JSON: ${detail}` }]);
    }
  }
  const issues = validateLog(value);
  if (issues.length > 0) throw new LensValidationError(issues);
  return structuredClone(value) as OperationLog;
}
