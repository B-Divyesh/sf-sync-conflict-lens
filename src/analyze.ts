import { parseLog } from './validation.js';
import type { Analysis, Conflict, JsonValue, Operation, OperationLog } from './types.js';

const CAVEAT = 'Diagnostic projection only: conflict detection uses parent links and field equality, not your sync engine’s merge semantics.';

function stableOperationCompare(left: Operation, right: Operation): number {
  return Date.parse(left.timestamp) - Date.parse(right.timestamp)
    || left.replica.localeCompare(right.replica)
    || left.id.localeCompare(right.id);
}

function causalSort(operations: Operation[]): { ordered: Operation[]; depth: Map<string, number> } {
  const byId = new Map(operations.map((operation) => [operation.id, operation]));
  const children = new Map<string, Operation[]>();
  const remaining = new Map<string, number>();
  const depth = new Map<string, number>();
  for (const operation of operations) {
    remaining.set(operation.id, operation.parents.length);
    for (const parent of operation.parents) children.set(parent, [...(children.get(parent) ?? []), operation]);
  }
  const ready = operations.filter((operation) => operation.parents.length === 0).sort(stableOperationCompare);
  const ordered: Operation[] = [];
  while (ready.length > 0) {
    const operation = ready.shift()!;
    ordered.push(operation);
    depth.set(operation.id, Math.max(0, ...operation.parents.map((parent) => (depth.get(parent) ?? 0) + 1)));
    for (const child of children.get(operation.id) ?? []) {
      const count = (remaining.get(child.id) ?? 1) - 1;
      remaining.set(child.id, count);
      if (count === 0) {
        ready.push(child);
        ready.sort(stableOperationCompare);
      }
    }
  }
  // parseLog has already rejected cycles; this is a defensive invariant.
  if (ordered.length !== byId.size) throw new Error('Could not establish causal order.');
  return { ordered, depth };
}

function valuesEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ancestorChecker(operations: Operation[]) {
  const byId = new Map(operations.map((operation) => [operation.id, operation]));
  const memo = new Map<string, Set<string>>();
  const ancestors = (id: string): Set<string> => {
    const cached = memo.get(id);
    if (cached) return cached;
    const result = new Set<string>();
    memo.set(id, result);
    for (const parent of byId.get(id)?.parents ?? []) {
      result.add(parent);
      for (const ancestor of ancestors(parent)) result.add(ancestor);
    }
    return result;
  };
  return (possibleAncestor: string, descendant: string) => ancestors(descendant).has(possibleAncestor);
}

function conflictFields(left: Operation, right: Operation): string[] {
  const fields = Object.keys(left.changes).filter((field) => field in right.changes && !valuesEqual(left.changes[field]!, right.changes[field]!));
  if (left.deleted !== right.deleted && (left.deleted === true || right.deleted === true)) fields.push('$deleted');
  return fields;
}

function applyOperation(state: Record<string, Record<string, JsonValue>>, operation: Operation): void {
  if (operation.deleted) {
    delete state[operation.entity];
    return;
  }
  state[operation.entity] = { ...(state[operation.entity] ?? {}), ...structuredClone(operation.changes) };
}

export function analyze(input: OperationLog | unknown): Analysis {
  const log = parseLog(input);
  const { ordered, depth } = causalSort(log.operations);
  const isAncestor = ancestorChecker(log.operations);
  const conflicts: Conflict[] = [];

  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    const left = ordered[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const right = ordered[rightIndex]!;
      if (left.replica === right.replica || left.entity !== right.entity) continue;
      if (isAncestor(left.id, right.id) || isAncestor(right.id, left.id)) continue;
      for (const field of conflictFields(left, right)) {
        conflicts.push({
          id: `${left.id}::${right.id}::${field}`,
          entity: left.entity,
          field,
          left: { operationId: left.id, replica: left.replica, value: field === '$deleted' ? Boolean(left.deleted) : left.changes[field]! },
          right: { operationId: right.id, replica: right.replica, value: field === '$deleted' ? Boolean(right.deleted) : right.changes[field]! },
          reason: 'Concurrent writes from different replicas changed the same field.'
        });
      }
    }
  }

  const projectedState: Record<string, Record<string, JsonValue>> = {};
  ordered.forEach((operation) => applyOperation(projectedState, operation));
  const replicas = [...new Set(ordered.map((operation) => operation.replica))];
  const finalStateByReplica: Analysis['finalStateByReplica'] = {};
  for (const replica of replicas) {
    const visible = new Set(ordered.filter((operation) => operation.replica === replica).map((operation) => operation.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const operation of ordered) {
        if (visible.has(operation.id)) for (const parent of operation.parents) if (!visible.has(parent)) { visible.add(parent); changed = true; }
      }
    }
    const state: Record<string, Record<string, JsonValue>> = {};
    ordered.filter((operation) => visible.has(operation.id)).forEach((operation) => applyOperation(state, operation));
    finalStateByReplica[replica] = state;
  }

  return {
    replicas,
    conflicts,
    timeline: ordered.map((operation, index) => ({
      index,
      operation,
      conflictIds: conflicts.filter((conflict) => conflict.left.operationId === operation.id || conflict.right.operationId === operation.id).map((conflict) => conflict.id),
      depth: depth.get(operation.id) ?? 0
    })),
    finalStateByReplica,
    projectedState,
    caveat: CAVEAT
  };
}
