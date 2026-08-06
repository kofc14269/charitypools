import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { fireEvent, getByPlaceholderText, getByText } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import PlayerProfile from '../PlayerProfile';
import { AppState, Pool, Participant, Square, GlobalSettings } from '../../types';

const settings: GlobalSettings = {
    adminPassword: 'admin',
    charityName: 'Test Charity',
    zelleAccount: '',
    paypalAccount: '',
    venmoAccount: '',
    otherPaymentInfo: ''
};

describe('PlayerProfile balance calculation', () => {
    test('shows zero payments when no payment history exists', async () => {
        const participant: Participant = {
            id: 'p-1',
            name: 'Frank Romano',
            email: 'frankie1ny@gmail.com',
            alias: 'FRANK ROMANO',
            paymentHistory: []
        } as Participant;

        const squares: Square[] = [
            { id: 0, row: 0, col: 0, participantId: 'p-1', alias: 'FRANK ROMANO', paidAmount: 0, assigned: true },
            { id: 1, row: 0, col: 1, participantId: null, alias: 'FRANK ROMANO', paidAmount: 0, assigned: true }
        ];

        const pool: Pool = {
            id: 'pool-1',
            name: 'Superbowl 2027 - 200',
            type: 'squares',
            participants: [participant],
            squares,
            settings: {
                adminPassword: 'admin',
                charityName: 'Test',
                teamA: 'Home',
                teamB: 'Away',
                costPerBox: 200,
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
                    scoreChangeMultiplier: 3
                }
            },
            scores: [],
            createdAt: Date.now()
        };

        const state: AppState = {
            pools: [pool],
            activePoolId: pool.id,
            globalSettings: settings
        } as AppState;

        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            createRoot(container).render(<PlayerProfile state={state} />);
        });

        const input = getByPlaceholderText(container, 'Email or phone...') as HTMLInputElement;
        await act(async () => {
            fireEvent.change(input, { target: { value: 'frankie1ny@gmail.com' } });
        });

        const button = getByText(container, /Go/i) as HTMLButtonElement;
        await act(async () => {
            fireEvent.click(button);
        });

        expect(container.textContent).toContain('$0');
        expect(container.textContent).toContain('$400');

        container.remove();
    });
});
