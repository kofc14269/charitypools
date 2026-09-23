import { Participant, Pool } from '../types';
import { allocatePaymentAcrossContestBalances, calculateParticipantContestBalances } from './finance';

export function buildContestPaymentUpdates(pools: Pool[], activePoolId: string | null, globalParticipants: Participant[], ownerUid: string, participantId: string, amount: number, method: string, note?: string, timestamp?: number) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a positive payment amount.');
    const orderedPools = [...pools].sort((left, right) => {
      if (left.id === activePoolId) return -1;
      if (right.id === activePoolId) return 1;
      return left.createdAt - right.createdAt;
    });
    const balances = calculateParticipantContestBalances(orderedPools, participantId);
    const allocations = allocatePaymentAcrossContestBalances(balances, amount);
    if (allocations.length === 0) throw new Error('No outstanding contest balance was found. Refresh and try again.');

    const updates: Record<string, any> = {};
    allocations.forEach(allocation => {
      const poolIndex = pools.findIndex(pool => pool.id === allocation.poolId);
      if (poolIndex === -1) return;
      const pool = pools[poolIndex];
      let participantIndex = (pool.participants || []).findIndex(participant => String(participant.id) === String(participantId));
      const participant = (pool.participants || [])[participantIndex]
        || globalParticipants.find(p => String(p.id) === String(participantId));
      if (!participant) throw new Error('Participant details could not be found. Refresh and try again.');
      const isNewParticipant = participantIndex === -1;
      if (isNewParticipant) participantIndex = (pool.participants || []).length;
      const transaction: any = {
        id: crypto.randomUUID(),
        amount: allocation.appliedAmount,
        method,
        timestamp: timestamp || Date.now(),
      };
      if (note?.trim()) transaction.note = note.trim();
      const participantPath = `users/${ownerUid}/state/pools/${poolIndex}/participants/${participantIndex}`;
      if (isNewParticipant) {
        // Guest reservations live outside the pool roster until an admin records a payment.
        // Never copy another contest's payment history from the global directory.
        updates[participantPath] = { ...participant, paymentHistory: [transaction] };
      } else {
        updates[`${participantPath}/paymentHistory`] = [...(participant.paymentHistory || []), transaction];
      }

      if (pool.type === 'squares') {
        let paidRemaining = allocation.totalPaid + allocation.appliedAmount;
        (pool.squares || []).forEach((square, squareIndex) => {
          if (String(square.participantId || '') !== String(participantId)) return;
          const paidAmount = Math.min(paidRemaining, pool.settings.costPerBox || 0);
          paidRemaining = Math.max(0, paidRemaining - paidAmount);
          updates[`users/${ownerUid}/state/pools/${poolIndex}/squares/${squareIndex}/paidAmount`] = paidAmount;
        });
      }
    });

    return updates;
}
