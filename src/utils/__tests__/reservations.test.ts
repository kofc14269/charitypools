import { expect, test } from 'vitest';
import { guestReservationUpdates, planBoxReservations } from '../reservations';
import { Pool, Participant } from '../../types';

const makePool = (id: string): Pool => ({ id, name: id, type: 'squares', createdAt: 1, participants: [],
  settings: { isLocked: false } as Pool['settings'], squares: [
    { id: 0, row: 0, col: 0, assigned: false, participantId: null, alias: '', paidAmount: 0 },
  ] });
const guest: Participant = { id: 'guest', name: 'Guest Name', email: 'guest@example.com', phone: '', alias: 'GUEST', soldBy: 'AB' };

test('guest details and boxes are written together to the link owner and selected contest', () => {
  const pools = [makePool('admin-active'), makePool('shared')];
  const groups = planBoxReservations(pools, 'shared', [0]);
  const updates = guestReservationUpdates('link-owner', guest, groups);
  expect(Object.keys(updates)).toEqual(['users/link-owner/state/guestParticipants/guest', 'users/link-owner/state/pools/1/squares/0']);
  expect(updates['users/link-owner/state/guestParticipants/guest']).toEqual(guest);
  expect(updates['users/link-owner/state/pools/1/squares/0']).toMatchObject({participantId: 'guest', assigned: true, paidAmount: 0, soldBy: 'AB'});
  expect(updates['users/link-owner/state/pools/1/squares/0']).not.toHaveProperty('email');
});

test('cart contest IDs take precedence over the currently displayed contest', () => {
  const pools = [makePool('one'), makePool('two')];
  const updates = guestReservationUpdates('owner', guest, planBoxReservations(pools, 'one', [0], { two: [0] }));
  expect(updates).toHaveProperty('users/owner/state/pools/1/squares/0');
  expect(updates).not.toHaveProperty('users/owner/state/pools/0/squares/0');
  expect(planBoxReservations(pools, 'one', [0], { one: [0], two: [0] })).toHaveLength(2);
});

test('rejects the entire cart when any selected box is taken, missing, or locked', () => {
  const pools = [makePool('one'), makePool('two')];
  pools[1].squares![0].assigned = true;
  expect(() => planBoxReservations(pools, 'one', [0], {one: [0], two: [0]})).toThrow('no longer available');
  expect(() => planBoxReservations(pools, 'missing', [0])).toThrow('unavailable');
  pools[0].settings.isLocked = true;
  expect(() => planBoxReservations(pools, 'one', [0])).toThrow('closed');
});
