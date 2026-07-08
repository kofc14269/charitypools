import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent, getByText } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';
import AdminPanel from '../AdminPanel';
import { GlobalSettings, Participant, Pool, PoolSettings } from '../../types';

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

function makeProps(overrides: Record<string, unknown> = {}) {
    const participant: Participant = {
        id: 'p-1',
        name: 'Rick Miller',
        email: 'rick@example.com',
        phone: '555-1000',
        alias: 'RICK M',
        paymentHistory: []
    };

    const pool: Pool = {
        id: 'pool-1',
        name: 'Pool 1',
        type: 'squares',
        squares: Array.from({ length: 100 }).map((_, i) => ({ id: i, row: Math.floor(i / 10), col: i % 10, participantId: null, alias: '', paidAmount: 0, assigned: false })),
        participants: [participant],
        settings: basePoolSettings,
        scores: [],
        createdAt: Date.now()
    };

    const globalSettings: GlobalSettings = { charityName: 'Test Charity', adminPassword: 'x' };

    return {
        ownerUid: 'owner-1',
        pools: [pool],
        activePoolId: pool.id,
        activePool: pool,
        poolSettings: pool.settings,
        globalSettings,
        onUpdateActivePool: vi.fn(),
        onUpdatePoolSettings: vi.fn(),
        onUpdateGlobalSettings: vi.fn(),
        onUpdateSquare: vi.fn(),
        onUpdateParticipant: vi.fn(),
        onUnassignSquare: vi.fn(),
        onClearUserBoxes: vi.fn(),
        onApplyPayment: vi.fn(),
        onEditPayment: vi.fn(),
        onDeletePayment: vi.fn(),
        onResetGrid: vi.fn(),
        onAddScore: vi.fn(),
        onUpdateScore: vi.fn(),
        onDeleteScore: vi.fn(),
        onCreatePool: vi.fn(),
        onDeletePool: vi.fn(),
        onSwitchPool: vi.fn(),
        onCreateGlobalParticipant: vi.fn(),
        onGenerateNumbers: vi.fn(),
        squares: pool.squares || [],
        participants: pool.participants,
        allParticipants: pool.participants,
        scores: [],
        ...overrides,
    };
}

describe('AdminPanel participant editing', () => {
    test('shows alias and updates an existing participant from the names table', async () => {
        const props = makeProps();
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            createRoot(container).render(<AdminPanel {...props} />);
        });

        await act(async () => {
            fireEvent.click(getByText(container, /names & teams/i));
        });

        expect(container.textContent).toContain('RICK M');
        expect(getByText(container, /edit entry/i)).toBeTruthy();

        await act(async () => {
            fireEvent.click(getByText(container, /edit entry/i));
        });

        const aliasInput = container.querySelector('input[title="Alias"]') as HTMLInputElement;
        const nameInput = container.querySelector('input[title="Full name"]') as HTMLInputElement;
        expect(aliasInput.value).toBe('RICK M');
        expect(nameInput.value).toBe('Rick Miller');

        await act(async () => {
            fireEvent.change(aliasInput, { target: { value: 'rm2' } });
            fireEvent.change(nameInput, { target: { value: 'Rick Miller Jr' } });
            fireEvent.submit(aliasInput.closest('form') as HTMLFormElement);
        });

        expect(props.onUpdateParticipant).toHaveBeenCalledWith('p-1', expect.objectContaining({
            name: 'Rick Miller Jr',
            alias: 'RM2'
        }));

        container.remove();
    });
});