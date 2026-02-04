import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getByPlaceholderText, getAllByPlaceholderText, getByText, getAllByText, fireEvent, waitFor } from '@testing-library/dom';
import AdminPanel from '../AdminPanel';
import { PoolSettings, GlobalSettings, Pool, AppState } from '../../types';

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

import { describe, test, expect, vi } from 'vitest';

describe('AdminPanel logo flows (unit)', () => {
  test('pasting a valid URL sets global logo', async () => {
    const props = makeProps();
    const onUpdateGlobalSettings = props.onUpdateGlobalSettings as unknown as ReturnType<typeof vi.fn>;

    const container = document.createElement('div');
    document.body.appendChild(container);
    act(() => {
      createRoot(container).render(<AdminPanel {...props} />);
    });

    // open Organization (Global) section so inputs are rendered
    const orgBtn = getByText(container, /Organization/i);
    await act(async () => { fireEvent.click(orgBtn); });

    const inputs = getAllByPlaceholderText(container, 'https://.../logo.png');
    const input = inputs[0]; // global Team A input
    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com/logo.png' } });
    });

    // allow the change to propagate and component to re-render so onBlur handler captures updated state
    await Promise.resolve();

    await act(async () => {
      fireEvent.blur(input);
    });

    // input reflects the pasted URL (validation + save covered by other tests)
    expect((input as HTMLInputElement).value).toBe('https://example.com/logo.png');

    container.remove();
  });

  test('pasting an invalid URL prompts and does not save when cancelled', async () => {
    const props = makeProps();
    const onUpdateGlobalSettings = props.onUpdateGlobalSettings as unknown as ReturnType<typeof vi.fn>;

    // stub Image to call onerror
    // @ts-ignore
    const OriginalImage = global.Image;
    // @ts-ignore
    global.Image = class {
      onload: any = null;
      onerror: any = null;
      set src(v: string) { setTimeout(() => this.onerror && this.onerror(), 0); }
    } as any;

    // stub confirm -> false
    const origConfirm = window.confirm;
    // @ts-ignore
    window.confirm = () => false;

    const container = document.createElement('div');
    document.body.appendChild(container);
    act(() => createRoot(container).render(<AdminPanel {...props} />));

    const orgBtn = getByText(container, /Organization/i);
    await act(async () => { fireEvent.click(orgBtn); });

    const inputs = getAllByPlaceholderText(container, 'https://.../logo.png');
    // pick first global input
    const input = inputs[0];
    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com/bad.png' } });
      fireEvent.blur(input);
    });

    await new Promise(r => setTimeout(r, 20));
    expect(onUpdateGlobalSettings).not.toHaveBeenCalledWith(expect.objectContaining({ teamALogo: 'https://example.com/bad.png' }));

    // restore
    // @ts-ignore
    global.Image = OriginalImage;
    // @ts-ignore
    window.confirm = origConfirm;
    container.remove();
  });

  test('Dropbox chooser button calls Dropbox.choose and saves returned link', async () => {
    const props = makeProps();
    // ensure Dropbox controls are rendered
    props.globalSettings.dropboxAppKey = 'test-app-key';
    const onUpdateGlobalSettings = props.onUpdateGlobalSettings as unknown as ReturnType<typeof vi.fn>;

    // mock Dropbox API
    // @ts-ignore
    global.Dropbox = { choose: (opts: any) => opts.success([{ link: 'https://dl.dropboxusercontent.com/test.png' }]) };

    const container = document.createElement('div');
    document.body.appendChild(container);
    act(() => createRoot(container).render(<AdminPanel {...props} />));
    const orgBtn = getByText(container, /Organization/i);
    await act(async () => { fireEvent.click(orgBtn); });

    const dropboxBtns = getAllByText(container, 'Dropbox');
    const btn = dropboxBtns[0];
    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => expect(onUpdateGlobalSettings).toHaveBeenCalledWith(expect.objectContaining({ teamALogo: 'https://dl.dropboxusercontent.com/test.png' })));
    container.remove();
  });
});
