export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface Operation {
  id: string;
  replica: string;
  entity: string;
  timestamp: string;
  parents: string[];
  changes: Record<string, JsonValue>;
  deleted?: boolean;
  metadata?: Record<string, JsonValue>;
}

export interface OperationLog {
  version: 1;
  operations: Operation[];
  source?: string;
}

export interface ValidationIssue {
  path: string;
  code: 'type' | 'required' | 'format' | 'duplicate' | 'reference' | 'cycle' | 'limit';
  message: string;
}

export interface ConflictSide {
  operationId: string;
  replica: string;
  value: JsonValue;
}

export interface Conflict {
  id: string;
  entity: string;
  field: string;
  left: ConflictSide;
  right: ConflictSide;
  reason: string;
}

export interface TimelineStep {
  index: number;
  operation: Operation;
  conflictIds: string[];
  depth: number;
}

export interface Analysis {
  replicas: string[];
  timeline: TimelineStep[];
  conflicts: Conflict[];
  finalStateByReplica: Record<string, Record<string, Record<string, JsonValue>>>;
  projectedState: Record<string, Record<string, JsonValue>>;
  caveat: string;
}

export interface RedactionOptions {
  /** Dot paths support `*` and `**`; a bare field name matches at any depth. */
  paths: string[];
  replacement?: string;
}

export interface RedactionResult {
  log: OperationLog;
  redactedPaths: string[];
  redactionCount: number;
}

export interface ExportOptions {
  redact: RedactionOptions;
  notes?: string;
  generatedAt?: string;
}

export interface BugBundle {
  format: 'sync-conflict-lens-bundle';
  version: 1;
  generatedAt: string;
  notes: string;
  log: OperationLog;
  analysis: Analysis;
  redaction: {
    rules: string[];
    replacement: string;
    count: number;
    paths: string[];
  };
}
