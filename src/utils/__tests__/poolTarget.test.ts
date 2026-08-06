import { describe, expect, test } from 'vitest';
import { resolveTargetPoolId } from '../poolTarget';
import { AppState, Pool } from '../../types';

describe('resolveTargetPoolId', () => {
    test('prefers the currently rendered public share pool over a stale global active pool id', () => {
        const state = {
            activePoolId: 'stale-default-pool',
            pools: [
                { id: 'stale-default-pool', name: 'Default Pool', type: 'squares', participants: [], squares: [], settings: { costPerBox: 10, rowNumbers: [], colNumbers: [], isLocked: false, payouts: { mode: 'standard', standardPayoutType: 'percent', charityPayoutType: 'percent', charityPercent: 50, charityFixedAmount: 0, standardSplits: { q1: 20, half: 30, q3: 20, final: 30 }, scoreChangeMultiplier: 3 } }, scores: [], createdAt: Date.now() },
                { id: 'public-share-pool', name: 'Share Pool', type: 'squares', participants: [], squares: [], settings: { costPerBox: 10, rowNumbers: [], colNumbers: [], isLocked: false, payouts: { mode: 'standard', standardPayoutType: 'percent', charityPayoutType: 'percent', charityPercent: 50, charityFixedAmount: 0, standardSplits: { q1: 20, half: 30, q3: 20, final: 30 }, scoreChangeMultiplier: 3 } }, scores: [], createdAt: Date.now() },
            ],
            participants: [],
            globalSettings: { charityName: 'Test', adminPassword: 'admin' },
        } as AppState;

        const activePool = state.pools[1] as Pool;

        expect(resolveTargetPoolId(state, activePool)).toBe('public-share-pool');
    });
});
