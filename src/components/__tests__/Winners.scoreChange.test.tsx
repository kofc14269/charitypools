import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent, getByLabelText, getByRole } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';
import Winners from '../Winners';
import { GameSettings, Pool } from '../../types';

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
        mode: 'scoreChange',
        standardPayoutType: 'percent',
        charityPayoutType: 'percent',
        charityPercent: 50,
        charityFixedAmount: 0,
        standardSplits: { q1: 20, half: 30, q3: 20, final: 30 },
        scoreChangeMultiplier: 3,
        scoreChangeInitialRefund: true,
        scoreChangeAppliesTo: 'perBox'
    }
};

const activePool: Pool = {
    id: 'pool-1',
    name: 'Score Change Pool',
    type: 'squares',
    participants: [],
    squares: Array.from({ length: 100 }, (_, id) => ({
        id,
        row: Math.floor(id / 10),
        col: id % 10,
        participantId: null,
        alias: '',
        paidAmount: 0,
        assigned: false
    })),
    settings,
    scores: [],
    createdAt: Date.now()
};

describe('Winners score-change entry', () => {
    test('admin can add a score entry', async () => {
        const onAddScore = vi.fn();
        const onUpdateScore = vi.fn();
        const onDeleteScore = vi.fn();

        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            createRoot(container).render(
                <Winners
                    activePool={activePool}
                    settings={settings}
                    onAddScore={onAddScore}
                    onUpdateScore={onUpdateScore}
                    onDeleteScore={onDeleteScore}
                    isAdmin={true}
                />
            );
        });

        await act(async () => {
            fireEvent.change(getByLabelText(container, /home score/i), { target: { value: '14' } });
            fireEvent.change(getByLabelText(container, /away score/i), { target: { value: '7' } });
            fireEvent.click(getByRole(container, 'button', { name: /add score/i }));
        });

        expect(onAddScore).toHaveBeenCalledTimes(1);
        expect(onUpdateScore).not.toHaveBeenCalled();
        expect(onAddScore).toHaveBeenCalledWith(expect.objectContaining({
            teamAScore: 14,
            teamBScore: 7,
            label: 'Score Change'
        }));

        container.remove();
    });

    test('aggregates winnings by player and sorts highest totals first', async () => {
        const onAddScore = vi.fn();
        const onUpdateScore = vi.fn();
        const onDeleteScore = vi.fn();

        const breakdownPool: Pool = {
            ...activePool,
            participants: [
                { id: 'p1', name: 'Rick', email: '', phone: '', alias: 'RICK M' },
                { id: 'p2', name: 'Sam', email: '', phone: '', alias: 'SL D' }
            ],
            squares: activePool.squares.map(square => {
                if (square.id === 12) {
                    return { ...square, assigned: true, alias: 'RICK M', participantId: 'p1' };
                }
                if (square.id === 67) {
                    return { ...square, assigned: true, alias: 'SL D', participantId: 'p2' };
                }
                return square;
            }),
            scores: [
                { id: 'score-1', label: 'Score Change', teamAScore: 1, teamBScore: 2, timestamp: 1, customPayout: 300 },
                { id: 'score-2', label: 'Score Change', teamAScore: 6, teamBScore: 7, timestamp: 2, customPayout: 300 },
                { id: 'score-3', label: 'Score Update', teamAScore: 16, teamBScore: 17, timestamp: 3, customPayout: 300 }
            ]
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            createRoot(container).render(
                <Winners
                    activePool={breakdownPool}
                    settings={settings}
                    onAddScore={onAddScore}
                    onUpdateScore={onUpdateScore}
                    onDeleteScore={onDeleteScore}
                    isAdmin={false}
                />
            );
        });

        const text = container.textContent || '';

        expect(text).toContain('Live Winner Breakdown');
        expect(text.match(/SL D/g)?.length).toBe(1);
        expect(text.match(/RICK M/g)?.length).toBe(1);
        expect(text).toContain('$600.00');
        expect(text).toContain('$300.00');
        expect(text.indexOf('SL D')).toBeLessThan(text.indexOf('RICK M'));

        container.remove();
    });
});