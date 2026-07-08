import { ScoreEntry, GameSettings, Square, ThirteenRunData } from '../types';

export const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export const resolveStandardPayoutKey = (label: string, index: number): keyof GameSettings['payouts']['standardSplits'] => {
  const normalized = String(label || '').trim().toLowerCase();
  if (normalized.includes('q1') || normalized.includes('1st')) return 'q1';
  if (normalized.includes('half') || normalized.includes('q2') || normalized.includes('2nd')) return 'half';
  if (normalized.includes('q3') || normalized.includes('3rd')) return 'q3';
  if (normalized.includes('final') || normalized.includes('q4') || normalized.includes('4th')) return 'final';
  const fallbackByOrder: Array<keyof GameSettings['payouts']['standardSplits']> = ['q1', 'half', 'q3', 'final'];
  return fallbackByOrder[index % fallbackByOrder.length];
};

export const parseCustomPayoutValue = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const normalized = trimmed.replace(/[$,\s]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }
  return undefined;
};

export const resolvePayoutOverride = (entry: Partial<ScoreEntry>): number | undefined => {
  return parseCustomPayoutValue(entry.customPayout) ?? parseCustomPayoutValue(entry.payout);
};

export const solvePayoutForEntry = (
  entry: ScoreEntry,
  index: number,
  scores: ScoreEntry[],
  settings: GameSettings,
  payoutPot: number
): number => {
  const { payouts, costPerBox } = settings;
  const payoutOverride = resolvePayoutOverride(entry);

  if (payoutOverride !== undefined) return payoutOverride;

  if (payouts.mode === 'scoreChange') {
    const isInitialZeroZero = entry.teamAScore === 0
      && entry.teamBScore === 0
      && !scores.slice(0, index).some(previous => previous.teamAScore === 0 && previous.teamBScore === 0);
    return isInitialZeroZero && payouts.scoreChangeInitialRefund !== false
      ? costPerBox
      : costPerBox * (payouts.scoreChangeMultiplier || 3);
  } else if (payouts.mode === 'singleWinner') {
    // Only the final score entry (the latest logged one) gets the 100% payout, others get 0
    const isLastEntry = index === scores.length - 1;
    return isLastEntry ? payoutPot : 0;
  } else {
    const splitKey = resolveStandardPayoutKey(entry.label, index);
    return payouts.standardPayoutType === 'fixed'
      ? payouts.standardSplits[splitKey] || 0
      : payoutPot * ((payouts.standardSplits[splitKey] || 0) / 100);
  }
};

export const calculateFinancialSummary = (
  activePool: any,
  settings: GameSettings,
  scores: ScoreEntry[],
  squares: Square[]
) => {
  const cost = settings.costPerBox || 0;
  let totalPotential = 0;

  if (activePool?.type === '13run') {
    totalPotential = Object.values((activePool.gameData as ThirteenRunData)?.entries || {}).filter((e: any) => e.participantId).length * cost;
  } else if (activePool?.type === 'survivor') {
    totalPotential = (activePool.participants || []).length * cost;
  } else {
    // Squares
    totalPotential = squares.filter(s => s.assigned).length * cost;
  }

  const payouts = settings.payouts;
  const charityAmountProjected = payouts.charityPayoutType === 'fixed'
    ? (payouts.charityFixedAmount || 0)
    : ((payouts.charityPercent || 50) / 100) * totalPotential;
  
  const projectedPlayerPot = totalPotential - charityAmountProjected;

  // Actual Payouts based on Winners List
  const totalActualPayouts = scores.reduce((sum, entry, index) => {
    return sum + solvePayoutForEntry(entry, index, scores, settings, projectedPlayerPot);
  }, 0);

  return {
    totalPot: totalPotential,
    playerPot: totalActualPayouts,
    projectedPlayerPot,
    charityAmount: Math.max(0, totalPotential - totalActualPayouts),
    projectedCharity: charityAmountProjected
  };
};
