import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent, getByText } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';
import Stats from '../Stats';
import { GameSettings, Participant, Pool } from '../../types';

const settings: GameSettings = {
    adminPassword: 'admin',
    charityName: 'Test Charity',
    teamA: 'Home',
    teamB: 'Away',
    costPerBox: 10,
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

describe('Stats participant identity display', () => {
    test('shows participant financials and allows editing winnings paid out', async () => {
        const participant: Participant = {
            id: 'p-1',
            name: 'Rick Miller',
            email: 'rick@example.com',
            phone: '555-1111',
            alias: 'RICK M',
            paymentHistory: [
                { id: 'pay-1', amount: 5, method: 'Cash', timestamp: 1 }
            ]
        };

        const activePool: Pool = {
            id: 'pool-1',
            name: 'Pool 1',
            type: 'squares',
            participants: [participant],
            squares: Array.from({ length: 100 }, (_, id) => ({
                id,
                row: Math.floor(id / 10),
                col: id % 10,
                participantId: id === 0 ? 'p-1' : null,
                alias: id === 0 ? 'RICK M' : '',
                paidAmount: 0,
                assigned: id === 0
            })),
            settings,
            scores: [
                { id: 'score-1', label: 'Q1', teamAScore: 0, teamBScore: 0, timestamp: 2, customPayout: 20 }
            ],
            createdAt: Date.now()
        };

        const container = document.createElement('div');
        document.body.appendChild(container);
        const onUpdateParticipant = vi.fn();
        const onUpdateScore = vi.fn();

        await act(async () => {
            createRoot(container).render(
                <Stats
                    activePool={activePool}
                    squares={activePool.squares || []}
                    participants={activePool.participants}
                    settings={settings}
                    scores={activePool.scores || []}
                    poolName={activePool.name}
                    onUpdateSquare={vi.fn()}
                    onUpdateParticipant={onUpdateParticipant}
                    onUpdateScore={onUpdateScore}
                    onUnassignSquare={vi.fn()}
                    onClearUserBoxes={vi.fn()}
                    onApplyPayment={vi.fn()}
                    onEditPayment={vi.fn()}
                    onDeletePayment={vi.fn()}
                />
            );
        });

        expect(container.textContent).toContain('Rick Miller');
        expect(container.textContent).toContain('RICK M');
        expect(container.textContent).toContain('Paid: $5.00');
        expect(container.textContent).toContain('Won: $20.00');
        expect(container.textContent).toContain('Paid Out: $0.00');
        expect(container.textContent).toContain('Owed: $0.00');

        await act(async () => {
            fireEvent.click(getByText(container, /add payment/i));
        });

        expect(container.textContent).toContain('Rick Miller (RICK M)');

        await act(async () => {
            fireEvent.click(getByText(container, /manage/i));
        });

        expect(container.textContent).toContain('Manage Participant');
        expect(container.textContent).toContain('Winner Payout Entries');

        await act(async () => {
            fireEvent.change(container.querySelector('input[id="winner-payout-amount"]') as HTMLInputElement, { target: { value: '15' } });
            fireEvent.change(container.querySelector('select[id="winner-payout-method"]') as HTMLSelectElement, { target: { value: 'PayPal' } });
            fireEvent.change(container.querySelector('input[id="winner-payout-note"]') as HTMLInputElement, { target: { value: 'Partial payout' } });
            fireEvent.click(getByText(container, /add payout/i));
        });

        expect(onUpdateParticipant).toHaveBeenCalledWith('p-1', expect.objectContaining({
            winningsPayoutHistory: [expect.objectContaining({
                amount: 15,
                method: 'PayPal',
                note: 'Partial payout'
            })]
        }));

        await act(async () => {
            fireEvent.change(container.querySelector('input[id="participant-alias"]') as HTMLInputElement, { target: { value: 'RM2' } });
            fireEvent.click(getByText(container, /save participant/i));
        });

        expect(onUpdateParticipant).toHaveBeenCalledWith('p-1', expect.objectContaining({ alias: 'RM2' }));

        container.remove();
    });
});
