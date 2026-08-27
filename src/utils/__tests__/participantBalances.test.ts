import { describe, expect, test } from 'vitest';
import { Pool } from '../../types';
import { allocatePaymentAcrossContestBalances, calculateParticipantContestBalances } from '../finance';

const settings = {
  teamA: 'A', teamB: 'B', costPerBox: 10,
  rowNumbers: [], colNumbers: [], isLocked: false,
  payouts: {
    mode: 'standard' as const,
    standardPayoutType: 'percent' as const,
    charityPayoutType: 'percent' as const,
    charityPercent: 50, charityFixedAmount: 0,
    standardSplits: { q1: 20, half: 30, q3: 20, final: 30 },
    scoreChangeMultiplier: 3,
  },
};

describe('calculateParticipantContestBalances', () => {
  test('returns each contest and the outstanding total inputs for one participant', () => {
    const participant = { id: 'p1', name: 'Frank', email: '', phone: '', alias: 'FRANK', paymentHistory: [] };
    const pools: Pool[] = [
      {
        id: 'one', name: 'Contest One', type: 'squares', settings,
        participants: [participant], createdAt: 1,
        squares: [
          { id: 0, row: 0, col: 0, participantId: 'p1', alias: 'FRANK', paidAmount: 10, assigned: true },
          { id: 1, row: 0, col: 1, participantId: 'p1', alias: 'FRANK', paidAmount: 0, assigned: true },
        ],
      },
      {
        id: 'two', name: 'Contest Two', type: '13run', settings: { ...settings, costPerBox: 20 },
        participants: [{ ...participant, paymentHistory: [{ id: 'x', amount: 5, method: 'Cash', timestamp: 1 }] }], createdAt: 2,
        gameData: { entries: { NYY: { participantId: 'p1', teamId: 'NYY', teamName: 'Yankees', punches: [], isWinner: false } } },
      },
    ];

    expect(calculateParticipantContestBalances(pools, 'p1')).toEqual([
      expect.objectContaining({ poolName: 'Contest One', entryCount: 2, totalDue: 20, totalPaid: 10, outstanding: 10 }),
      expect.objectContaining({ poolName: 'Contest Two', entryCount: 1, totalDue: 20, totalPaid: 5, outstanding: 15 }),
    ]);
  });

  test('allocates a payment oldest balance first without overpaying a contest', () => {
    const balances = [
      { poolId: 'old', poolName: 'Old', poolType: 'squares' as const, entryCount: 2, totalDue: 20, totalPaid: 5, outstanding: 15 },
      { poolId: 'new', poolName: 'New', poolType: 'squares' as const, entryCount: 3, totalDue: 30, totalPaid: 0, outstanding: 30 },
    ];

    expect(allocatePaymentAcrossContestBalances(balances, 25).map(({ poolId, appliedAmount }) => ({ poolId, appliedAmount }))).toEqual([
      { poolId: 'old', appliedAmount: 15 },
      { poolId: 'new', appliedAmount: 10 },
    ]);
  });
});
