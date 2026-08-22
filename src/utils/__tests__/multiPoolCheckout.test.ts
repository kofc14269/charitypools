import { describe, expect, it } from 'vitest';
import { Pool } from '../../types';
import { getAvailableSquarePools } from '../multiPoolCheckout';

const pool = (id: string, options: { locked?: boolean; assigned?: boolean; type?: Pool['type'] } = {}): Pool => ({
  id,
  name: id,
  type: options.type || 'squares',
  createdAt: 1,
  participants: [],
  settings: { isLocked: !!options.locked } as Pool['settings'],
  squares: [{ id: 0, row: 0, col: 0, participantId: null, alias: '', paidAmount: 0, assigned: !!options.assigned }],
});

describe('multi-pool checkout availability', () => {
  it('lists unlocked square pools with an available box', () => {
    const pools = [pool('one'), pool('two'), pool('locked', { locked: true }), pool('full', { assigned: true }), pool('survivor', { type: 'survivor' })];

    expect(getAvailableSquarePools(pools).map(p => p.id)).toEqual(['one', 'two']);
  });
});
