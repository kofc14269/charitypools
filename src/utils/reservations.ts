import { Participant, Pool } from '../types';

export function planBoxReservations(pools: Pool[], activePoolId: string, ids: number[], selections?: Record<string, number[]>) {
  const selected = selections && Object.values(selections).some(value => value.length)
    ? selections : { [activePoolId]: ids };
  const groups = Object.entries(selected).filter(([, values]) => values.length).map(([poolId, values]) => {
    const poolIndex = pools.findIndex(pool => pool.id === poolId);
    const pool = pools[poolIndex];
    if (!pool || pool.type !== 'squares') throw new Error('Contest is unavailable. Refresh the board and try again.');
    if (pool.settings.isLocked) throw new Error(`${pool.name} is closed for reservations.`);
    const squareIds = [...new Set(values)];
    for (const id of squareIds) {
      const square = pool.squares?.[id];
      if (!Number.isInteger(id) || !square || square.assigned) throw new Error(`A selected box in ${pool.name} is no longer available. Please review your selection.`);
    }
    return { pool, poolIndex, squareIds };
  });
  if (!groups.length) throw new Error('Select at least one available box.');
  return groups;
}

export function guestReservationUpdates(ownerUid: string, participant: Participant, groups: ReturnType<typeof planBoxReservations>) {
  const base = `users/${ownerUid}/state`;
  const updates: Record<string, any> = { [`${base}/guestParticipants/${participant.id}`]: participant };
  for (const { pool, poolIndex, squareIds } of groups) {
    for (const id of squareIds) {
      const square = pool.squares![id];
      updates[`${base}/pools/${poolIndex}/squares/${id}`] = {
        id: square.id, row: square.row, col: square.col,
        participantId: participant.id, alias: participant.alias.toUpperCase(),
        soldBy: participant.soldBy || '', assigned: true, paidAmount: 0,
      };
    }
  }
  return updates;
}
