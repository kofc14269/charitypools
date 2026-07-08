
export interface PaymentTransaction {
  id: string;
  amount: number;
  method: string;
  timestamp: number;
  note?: string;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string;
  alias: string;
  paymentHistory?: PaymentTransaction[];
  winningsPayoutHistory?: PaymentTransaction[];
}

export interface Square {
  id: number;
  row: number;
  col: number;
  participantId: string | null;
  alias: string;
  paidAmount: number;
  paymentMethod?: string;
  assigned: boolean;
}

export interface ScoreEntry {
  id: string;
  teamAScore: number;
  teamBScore: number;
  label: string; // "Q1", "Score Change", etc.
  timestamp: number;
  // Legacy/compat payout override field used by older records and admin edits.
  payout?: number;
  customPayout?: number;
  amountPaidTowardWinnings?: number;
  winningsPaymentMethod?: string;
}

export interface PayoutSettings {
  mode: 'standard' | 'scoreChange' | 'singleWinner';
  standardPayoutType: 'percent' | 'fixed';
  charityPayoutType: 'percent' | 'fixed';
  charityPercent: number;
  charityFixedAmount: number;
  standardSplits: {
    q1: number;
    half: number;
    q3: number;
    final: number;
  };
  scoreChangeMultiplier: number;
  // Whether the score-change multiplier applies to each box (`perBox`) or the full pool (`totalPot`).
  scoreChangeAppliesTo?: 'perBox' | 'totalPot';
  // If true, the initial 0-0 score awards a refund (costPerBox) to the winning box.
  scoreChangeInitialRefund?: boolean;
}

export interface GlobalSettings {
  adminPassword?: string;
  charityName: string;
  zelleAccount?: string;
  paypalAccount?: string;
  paypalLink?: string;
  venmoAccount?: string;
  otherPaymentInfo?: string;
  dropboxAppKey?: string;
  dropboxLastSync?: number;
  lastCloudSync?: number;
  // Optional GitHub hosting config (used only if provided)
  githubToken?: string; // personal access token (optional)
  githubRepo?: string; // owner/repo (optional) - used as upload target
  // Default team logos (applied across pools unless overridden)
  teamALogo?: string;
  teamBLogo?: string;
}

export interface PoolSettings {
  teamA: string;
  teamB: string;
  // Optional per-pool overrides for logos. If not set, fall back to GlobalSettings.teamALogo/teamBLogo
  teamALogo?: string;
  teamBLogo?: string;
  costPerBox: number;
  rowNumbers: number[];
  colNumbers: number[];
  isLocked: boolean;
  payouts: PayoutSettings;
  rules?: string;
}

// Added GameSettings to fix missing export error in components
export type GameSettings = GlobalSettings & PoolSettings;

export type PoolType = 'squares' | 'survivor' | '13run' | 'pickem';

export interface SurvivorPick {
  week: number;
  teamId: string;
  teamName: string;
  status: 'pending' | 'win' | 'loss' | 'draw';
}

export interface SurvivorData {
  participants: {
    [participantId: string]: {
      picks: SurvivorPick[];
      isEliminated: boolean;
      eliminatedWeek?: number;
    }
  };
  currentWeek: number;
}

export interface ThirteenRunEntry {
  participantId?: string | null;
  teamId: string;
  teamName: string;
  punches: number[]; // Array of scores achieved (0-13)
  isWinner: boolean;
}

export interface ThirteenRunData {
  entries: {
    [teamId: string]: ThirteenRunEntry;
  };
}

export interface Pool {
  id: string;
  name: string;
  type: PoolType;
  sport?: string;
  squares?: Square[]; // Optional: only for squares type
  participants: Participant[];
  settings: PoolSettings;
  scores?: ScoreEntry[]; // Optional: primarily for squares type
  gameData?: SurvivorData | ThirteenRunData; // Modular data for new engines
  createdAt: number;
}

export interface AppState {
  pools: Pool[];
  participants?: Participant[]; // global participant registry
  activePoolId: string;
  globalSettings: GlobalSettings;
}

export type Tab = 'grid' | 'winners' | 'admin' | 'player' | 'survivor' | '13run';
