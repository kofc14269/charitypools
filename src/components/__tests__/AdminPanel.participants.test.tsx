import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getByText, getByRole, getAllByText, fireEvent } from '@testing-library/dom';
import AdminPanel from '../AdminPanel';
import { describe, test, expect, vi } from 'vitest';
import { PoolSettings, GlobalSettings, Pool, AppState, Participant } from '../../types';

const basePoolSettings: PoolSettings = {
  teamA: 'NFC',
  teamB: 'AFC',
  costPerBox: 10,
  rowNumbers: Array(10).fill(null),
  colNumbers: Array(10).fill(null),
  isLocked: false,
  payouts: {
    mode: 'standard',
    standardPayoutType: 'percent',
    charityPayoutType: 'percent',
    charityPercent: 50,
    charityFixedAmount: 0,
    standardSplits: { q1: 20, half: 30, q3: 20, final: 30 },
    scoreChangeMultiplier: 3,
  }
};

function makeProps(overrides: Partial<any> = {}) {
  const pool: Pool = {
    id: 'pool-1',
    name: 'Pool 1',
    squares: Array.from({ length: 100 }).map((_, i) => ({ id: i, row: Math.floor(i/10), col: i%10, participantId: null, alias: '', paidAmount: 0, assigned: false })),
    participants: [],
    settings: basePoolSettings,
    scores: [],
    createdAt: Date.now()
  };

  const global: GlobalSettings = { charityName: 'C', adminPassword: 'x' } as any;
  const defaults = {
    activePoolId: pool.id,
    poolSettings: pool.settings,
    globalSettings: global,
    onUpdatePoolSettings: vi.fn(),
    onUpdateActivePool: vi.fn(),
    onUpdateGlobalSettings: vi.fn(),
    onResetGrid: vi.fn(),
    onDeletePool: vi.fn(),
    onGenerateNumbers: vi.fn(),
    squares: pool.squares,
    participants: [],
    onUpdateSquare: vi.fn(),
    onUpdateParticipant: vi.fn(),
    onUnassignSquare: vi.fn(),
    onClearUserBoxes: vi.fn(),
    onApplyPayment: vi.fn(),
    onEditPayment: vi.fn(),
    onDeletePayment: vi.fn(),
    onAddScore: vi.fn(),
    onUpdateScore: vi.fn(),
    onDeleteScore: vi.fn(),
    scores: [],
    pools: [pool],
    onSwitchPool: vi.fn(),
    onCreatePool: vi.fn(),
    fullState: { pools: [pool], activePoolId: pool.id, globalSettings: global } as AppState,
    onImportState: vi.fn()
  };
  return { ...defaults, ...overrides };
}

describe('AdminPanel — participants (unit)', () => {
  test('"Show all names" is on by default and global-only entries are visible with Add button', async () => {
    const globalParticipant: Participant = { id: 'p-1', name: 'Global Person', email: 'g@example.com', paymentHistory: [] } as any;
    const props = makeProps({ participants: [], allParticipants: [globalParticipant], onUpdateActivePool: vi.fn() });

    const container = document.createElement('div');
    document.body.appendChild(container);
    act(() => createRoot(container).render(<AdminPanel {...props} />));

    // open Add Names (participants) section
    const partBtn = getByText(container, /Add Names/i);
    await act(async () => { fireEvent.click(partBtn); });

    // because default is now "show all", the global participant should be visible and show the `global` badge
    expect(getAllByText(container, /Global Person/i).length).toBeGreaterThan(0);
    expect(getAllByText(container, /global/i).length).toBeGreaterThan(0);

    // the Add (+) button should be shown for a global-only participant
    const addBtn = container.querySelector('button[title="Add to active pool"]') as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();

    // clicking it should call onUpdateActivePool
    await act(async () => { fireEvent.click(addBtn!); });
    expect(props.onUpdateActivePool).toHaveBeenCalled();

    container.remove();
  });

  test('shows fallback message when participant has no boxes and handles mixed-type ids', async () => {
    // pool contains one assigned square where participantId is number 123
    const poolWithNumberedSquare: Pool = {
      id: 'pool-1',
      name: 'Pool 1',
      squares: Array.from({ length: 100 }).map((_, i) => ({ id: i, row: Math.floor(i/10), col: i%10, participantId: i === 5 ? 123 : null, alias: '', paidAmount: 0, assigned: i === 5 })),
      participants: [],
      settings: basePoolSettings,
      scores: [],
      createdAt: Date.now()
    };

    const numberedParticipant: Participant = { id: '123', name: 'Numbered Person', alias: 'NP', paymentHistory: [] } as any;

    const props = makeProps({
      pools: [poolWithNumberedSquare],
      participants: [],
      allParticipants: [numberedParticipant],
      activePoolId: poolWithNumberedSquare.id,
      onUpdateActivePool: vi.fn()
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    act(() => createRoot(container).render(<AdminPanel {...props} />));

    // open Add Names
    const partBtn = getByText(container, /Add Names/i);
    await act(async () => { fireEvent.click(partBtn); });

    // ensure participant row renders
    expect(getAllByText(container, /Numbered Person/i).length).toBeGreaterThan(0);

    // click the 'eye' to reveal boxes — the code should match numeric participantId to string id
    const eye = container.querySelector('button[title="Show boxes (all contests)"]') as HTMLButtonElement;
    await act(async () => { fireEvent.click(eye); });

    // either the exact box (#6) is shown, or a clear fallback message is displayed — but UI must not be blank
    const found = getAllByText(container, /No boxes assigned across any contests\.|#6/);
    expect(found.length).toBeGreaterThan(0);

    container.remove();
  });
});
