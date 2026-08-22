import { Pool } from '../types';

export type PoolSelections = Record<string, number[]>;

export const getAvailableSquarePools = (pools: Pool[]) =>
  (pools || []).filter(pool =>
    (pool.type === 'squares' || !pool.type) &&
    !pool.settings?.isLocked &&
    (pool.squares || []).some(square => !square.assigned)
  );
