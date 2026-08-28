import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, test, vi } from 'vitest';
import Grid from '../Grid';
import { GameSettings, Pool } from '../../types';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as any;

const settings: GameSettings = {
  adminPassword: 'admin', charityName: 'Charity', teamA: 'A', teamB: 'B', costPerBox: 10,
  rowNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], colNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], isLocked: false,
  payouts: { mode: 'standard', standardPayoutType: 'percent', charityPayoutType: 'percent', charityPercent: 50, charityFixedAmount: 0, standardSplits: { q1: 20, half: 30, q3: 20, final: 30 }, scoreChangeMultiplier: 3 },
};
const square = { id: 0, row: 0, col: 0, participantId: 'p1', alias: 'SECRET ALIAS', paidAmount: 0, assigned: true };
const pool: Pool = { id: 'pool', name: 'Pool', type: 'squares', settings, participants: [], squares: [square], scores: [], createdAt: 1 };
const participant = { id: 'p1', name: 'Real Person', email: '', phone: '', alias: 'SECRET ALIAS', paymentHistory: [] };

const renderGrid = async (isAdmin: boolean) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <Grid squares={[square]} pendingSelection={[]} settings={settings} onSquareClick={vi.fn()} participants={[participant]} activePool={pool} isAdmin={isAdmin} />
    );
  });
  return container;
};

describe('Grid participant-name privacy', () => {
  test('public viewers see only the alias in the square and tooltip', async () => {
    const container = await renderGrid(false);
    const box = container.querySelector('.square-box') as HTMLElement;
    expect(box.title).toBe('Alias: SECRET ALIAS');
    expect(box.textContent).toContain('SECRET ALIAS');
    expect(box.textContent).not.toContain('Real Person');
  });

  test('admins can reveal the real name on hover', async () => {
    const container = await renderGrid(true);
    const box = container.querySelector('.square-box') as HTMLElement;
    expect(box.title).toContain('Player: Real Person');
    expect(box.textContent).toContain('Real Person');
  });
});
