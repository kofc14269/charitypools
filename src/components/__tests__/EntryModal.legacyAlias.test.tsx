import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent, getByText, getByPlaceholderText } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import EntryModal from '../EntryModal';
import { GameSettings, Participant, Pool, Square, ThirteenRunData } from '../../types';

const settings: GameSettings = {
    adminPassword: 'admin',
    charityName: 'Test Charity',
    teamA: 'Home',
    teamB: 'Away',
    costPerBox: 200,
    rowNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    colNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
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

const makePool = (): Pool => ({
    id: 'pool-1',
    name: 'Test Pool',
    type: 'squares',
    participants: [
        { id: 'p-1', name: 'Frank Romano', email: 'frank@example.com', alias: 'FRANK ROMANO', paymentHistory: [] } as Participant
    ],
    squares: [
        { id: 0, row: 0, col: 0, participantId: 'p-1', alias: 'FRANK ROMANO', paidAmount: 0, assigned: true },
        { id: 1, row: 0, col: 1, participantId: null, alias: 'FRANK ROMANO', paidAmount: 0, assigned: true },
    ] as Square[],
    settings,
    scores: [],
    createdAt: Date.now()
});

describe('EntryModal legacy alias matching', () => {
    test('verifies full balance when a participant has alias-only legacy squares', async () => {
        const pool = makePool();
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            createRoot(container).render(
                <EntryModal
                    isOpen={true}
                    onClose={() => { }}
                    onSubmit={() => { }}
                    onUnassign={() => { }}
                    onSetPendingSelection={() => { }}
                    selectedSquareIds={[0]}
                    activePool={pool}
                    existingParticipants={pool.participants}
                    settings={settings}
                    isAdmin={false}
                />
            );
        });

        expect(container.textContent).toContain('Manage Entry');

        const emailInput = getByPlaceholderText(container, 'Verify Email') as HTMLInputElement;
        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'frank@example.com' } });
        });

        const verifyButton = getByText(container, /Verify Ownership/i) as HTMLButtonElement;
        await act(async () => {
            fireEvent.click(verifyButton);
        });

        expect(container.textContent).toContain('Balance Due');
        expect(container.textContent).toContain('$400');
        container.remove();
    });

    test('accepts both email and phone as valid contact details', async () => {
        const pool = makePool();
        const unassignedPool = {
            ...pool,
            squares: [
                { ...pool.squares[0], participantId: 'p-1', alias: 'FRANK ROMANO', paidAmount: 0, assigned: true },
                { id: 1, row: 0, col: 1, participantId: null, alias: '', paidAmount: 0, assigned: false },
            ] as Square[]
        };
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            createRoot(container).render(
                <EntryModal
                    isOpen={true}
                    onClose={() => { }}
                    onSubmit={() => { }}
                    onUnassign={() => { }}
                    onSetPendingSelection={() => { }}
                    selectedSquareIds={[1]}
                    activePool={unassignedPool}
                    existingParticipants={pool.participants}
                    settings={settings}
                    isAdmin={false}
                />
            );
        });

        await act(async () => {
            fireEvent.change(getByPlaceholderText(container, 'Full Name'), { target: { value: 'Frank Romano' } });
            fireEvent.change(getByPlaceholderText(container, 'Email Address (optional)'), { target: { value: 'frank@example.com' } });
            fireEvent.change(getByPlaceholderText(container, 'Cell Number (optional)'), { target: { value: '(555) 123-4567' } });
            fireEvent.change(getByPlaceholderText(container, 'Alias (Visible on Grid)'), { target: { value: 'frank romano' } });
        });

        expect(container.textContent).not.toContain('Require either email or phone');
        const submitButton = getByText(container, /Confirm & Register/i) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(false);
        container.remove();
    });

    test('keeps the confirmation screen visible after a successful registration submission', async () => {
        const pool = makePool();
        const unassignedPool = {
            ...pool,
            squares: [
                { ...pool.squares[0], participantId: 'p-1', alias: 'FRANK ROMANO', paidAmount: 0, assigned: true },
                { id: 1, row: 0, col: 1, participantId: null, alias: '', paidAmount: 0, assigned: false },
            ] as Square[]
        };
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
            root.render(
                <EntryModal
                    isOpen={true}
                    onClose={() => { }}
                    onSubmit={() => { }}
                    onUnassign={() => { }}
                    onSetPendingSelection={() => { }}
                    selectedSquareIds={[1]}
                    activePool={unassignedPool}
                    existingParticipants={pool.participants}
                    settings={settings}
                    isAdmin={false}
                />
            );
        });

        await act(async () => {
            fireEvent.change(getByPlaceholderText(container, 'Full Name'), { target: { value: 'Frank Romano' } });
            fireEvent.change(getByPlaceholderText(container, 'Email Address (optional)'), { target: { value: 'frank@example.com' } });
            fireEvent.change(getByPlaceholderText(container, 'Alias (Visible on Grid)'), { target: { value: 'frank romano' } });
        });

        await act(async () => {
            fireEvent.click(getByText(container, /Confirm & Register/i));
        });

        const assignedPool = {
            ...unassignedPool,
            squares: unassignedPool.squares.map((sq, idx) => idx === 1 ? { ...sq, participantId: 'p-1', alias: 'FRANK ROMANO', assigned: true } : sq)
        };

        await act(async () => {
            root.render(
                <EntryModal
                    isOpen={true}
                    onClose={() => { }}
                    onSubmit={() => { }}
                    onUnassign={() => { }}
                    onSetPendingSelection={() => { }}
                    selectedSquareIds={[1]}
                    activePool={assignedPool}
                    existingParticipants={pool.participants}
                    settings={settings}
                    isAdmin={false}
                />
            );
        });

        expect(container.textContent).toContain('Successfully Claimed!');
        expect(container.textContent).toContain('Payment Portal');
        container.remove();
    });
});
