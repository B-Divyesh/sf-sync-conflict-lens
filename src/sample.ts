import type { OperationLog } from './types.js';

export const SAMPLE_LOG: OperationLog = {
  version: 1,
  source: 'checkout-notes reproduction',
  operations: [
    {
      id: 'base-1', replica: 'phone', entity: 'note:departure',
      timestamp: '2026-08-24T08:00:00.000Z', parents: [],
      changes: { title: 'Departure list', status: 'draft', ownerEmail: 'mina@example.test' }
    },
    {
      id: 'phone-2', replica: 'phone', entity: 'note:departure',
      timestamp: '2026-08-24T08:04:10.000Z', parents: ['base-1'],
      changes: { status: 'ready', note: 'Ask Mina at platform 2' },
      metadata: { device: 'Mina phone', sessionId: 'session-private-103' }
    },
    {
      id: 'laptop-2', replica: 'laptop', entity: 'note:departure',
      timestamp: '2026-08-24T08:04:22.000Z', parents: ['base-1'],
      changes: { status: 'blocked', note: 'Waiting for ticket' },
      metadata: { device: 'Work laptop', sessionId: 'session-private-104' }
    },
    {
      id: 'phone-3', replica: 'phone', entity: 'note:departure',
      timestamp: '2026-08-24T08:05:05.000Z', parents: ['phone-2'],
      changes: { checked: true }
    }
  ]
};
