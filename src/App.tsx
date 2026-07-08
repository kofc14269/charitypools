
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { AppState, Square, Tab, Participant, PaymentTransaction, Pool, GlobalSettings, PoolSettings, ScoreEntry, PoolType, SurvivorData, ThirteenRunData, ThirteenRunEntry } from './types';
import Grid from './components/Grid';
import { db, auth } from './firebase';
import { ref, onValue, set, update, get } from "firebase/database";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const EntryModal = lazy(() => import('./components/EntryModal'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));
const Winners = lazy(() => import('./components/Winners'));
const PlayerProfile = lazy(() => import('./components/PlayerProfile'));
const SurvivorEngine = lazy(() => import('./components/SurvivorEngine'));
const ThirteenRunEngine = lazy(() => import('./components/ThirteenRunEngine'));
import { fetchScores, GameEvent } from './services/sportsApi';

const createNewSquares = (): Square[] => Array.from({ length: 100 }, (_, i) => ({
  id: i,
  row: Math.floor(i / 10),
  col: i % 10,
  participantId: null,
  alias: '',
  paidAmount: 0,
  assigned: false,
}));

const DEFAULT_POOL_SETTINGS: PoolSettings = {
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
    charityFixedAmount: 500,
    standardSplits: { q1: 20, half: 30, q3: 20, final: 30 },
    scoreChangeMultiplier: 3,
    scoreChangeAppliesTo: 'perBox',
    scoreChangeInitialRefund: true
  }
};

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  adminPassword: 'admin',
  charityName: 'Kofc Charity Pools',
  zelleAccount: '',
  paypalAccount: '',
  venmoAccount: '',
  otherPaymentInfo: '',
};

const ADMIN_AUTH_SESSION_KEY = 'charitypools-admin-authenticated';

import { MLB_TEAMS, NFL_TEAMS } from './constants/sports';

const createPool = (name: string, type: PoolType = 'squares', settings: PoolSettings = DEFAULT_POOL_SETTINGS): Pool => {
  const pool: Pool = {
    id: crypto.randomUUID(),
    name,
    type,
    participants: [],
    scores: [],
    settings: { ...settings, isLocked: false, rowNumbers: Array(10).fill(null), colNumbers: Array(10).fill(null) },
    createdAt: Date.now(),
  };

  if (type === 'squares') {
    pool.squares = createNewSquares();
  }

  if (type === '13run') {
    const entries: { [key: string]: ThirteenRunEntry } = {};
    MLB_TEAMS.forEach(team => {
      entries[team.id] = {
        teamId: team.id,
        teamName: team.name,
        punches: [],
        isWinner: false,
        participantId: null
      };
    });
    pool.gameData = { entries };
  }

  if (type === 'survivor') {
    pool.gameData = {
      participants: {},
      currentWeek: 1
    };
  }

  return pool;
};

const getHeaderLogoFallback = (label: string) => {
  const safeLabel = (label || 'Kofc').trim().slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="#ffffff"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#312e81">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('grid');
  const [selectedSquareId, setSelectedSquareId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<number[]>([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminOption, setShowAdminOption] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === 'true';
  });

  // Sports Live Data
  const [liveScores, setLiveScores] = useState<{ nfl: GameEvent[], mlb: GameEvent[] }>({ nfl: [], mlb: [] });

  // Auth & Multi-tenant state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [headerLogoSrc, setHeaderLogoSrc] = useState(getHeaderLogoFallback('Kofc'));

  // Discover the UID of the data we should be looking at
  const [ownerUid, setOwnerUid] = useState<string | null>(null);

  const [copiedContestId, setCopiedContestId] = useState<string | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll main container to top reactively on tab change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Poll for live scores every 60 seconds
  useEffect(() => {
    const updateScores = async () => {
      const [nfl, mlb] = await Promise.all([
        fetchScores('football/nfl'),
        fetchScores('baseball/mlb')
      ]);
      setLiveScores({ nfl, mlb });
    };

    updateScores();
    const interval = setInterval(updateScores, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        console.log("Auth User:", user.email, "UID:", user.uid);
      }
      if (user && window.sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === 'true') {
        setIsAdminAuthenticated(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Pool ID pinned from ?p= URL param (for per-contest public links)
  const [urlPoolId, setUrlPoolId] = useState<string | null>(null);

  useEffect(() => {
    const getParam = () => {
      const params = new URLSearchParams(window.location.search);
      return params.get('p') || null;
    };
    setUrlPoolId(getParam());

    const handlePopState = () => {
      setUrlPoolId(getParam());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Determine Owner UID from URL or Auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    if (u) {
      setOwnerUid(u);
    } else if (authUser) {
      // Use their real UID to ensure Firebase Security Rules allow writes
      setOwnerUid(authUser.uid);
    } else {
      setOwnerUid(null);
    }
  }, [authUser]);

  // Migration & Synchronization Logic for kofc14269@gmail.com
  useEffect(() => {
    if (authUser?.email === 'kofc14269@gmail.com' && ownerUid) {
      const legacyRef = ref(db, 'state');
      const userRef = ref(db, `users/${ownerUid}/state`);

      const syncAccount = async () => {
        const userSnap = await get(userRef);
        
        // If the current user has no pools, try to bootstrap from the legacy global state
        if (!userSnap.exists() || (userSnap.val()?.pools?.length || 0) === 0) {
          const legacySnap = await get(legacyRef);
          if (legacySnap.exists() && (legacySnap.val()?.pools?.length || 0) > 0) {
            console.log("Empty account detected. Bootstrapping from Legacy Global state...");
            await set(userRef, legacySnap.val());
          }
        }
      };

      syncAccount();
    }
  }, [authUser, ownerUid]);

  useEffect(() => {
    if (!ownerUid) {
      setState({
        pools: [],
        participants: [],
        activePoolId: '',
        globalSettings: DEFAULT_GLOBAL_SETTINGS
      });
      setIsFirebaseLoaded(true);
      return;
    }

    const stateRef = ref(db, `users/${ownerUid}/state`);
    return onValue(stateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.pools) {
          const poolsData = Array.isArray(data.pools) ? data.pools : Object.values(data.pools);
          data.pools = poolsData.map((p: Pool) => {
            let squaresArr: Square[] = [];
            if (Array.isArray(p.squares)) {
              squaresArr = p.squares;
            } else if (p.squares && typeof p.squares === 'object') {
              squaresArr = Array.from({ length: 100 }, (_, i) => (p.squares as any)[i] || createNewSquares()[i]);
            } else {
              squaresArr = createNewSquares();
            }

            const normalizeAxis = (axis: any) => {
              if (Array.isArray(axis)) {
                return axis.length === 10 ? axis : [...axis, ...Array(10 - axis.length).fill(null)];
              }
              if (axis && typeof axis === 'object') {
                return Array.from({ length: 10 }, (_, i) => axis[i] ?? null);
              }
              return Array(10).fill(null);
            };

            const targetType = (p.type as string) === 'squares-1w' ? 'squares' : (p.type || 'squares');
            const targetPayouts = (p.type as string) === 'squares-1w'
              ? { ...DEFAULT_POOL_SETTINGS.payouts, ...p.settings?.payouts, mode: 'singleWinner' as const }
              : { ...DEFAULT_POOL_SETTINGS.payouts, ...p.settings?.payouts };

            return {
              ...p,
              type: targetType,
              squares: squaresArr,
              participants: p.participants || [],
              scores: p.scores || [],
              settings: {
                ...DEFAULT_POOL_SETTINGS,
                ...p.settings,
                rowNumbers: normalizeAxis(p.settings?.rowNumbers),
                colNumbers: normalizeAxis(p.settings?.colNumbers),
                payouts: targetPayouts
              }
            };
          });

          // Build a top-level participants registry (migration-friendly):
          if (!data.participants) {
            const byKey = new Map<string, Participant>();
            (data.pools || []).forEach((pool: Pool) => {
              (pool.participants || []).forEach((p: Participant) => {
                const key = p.id || (p.email || p.name || '').toLowerCase();
                if (!byKey.has(key)) byKey.set(key, p);
              });
            });
            data.participants = Array.from(byKey.values());
          }
        }
        setState(data);
      } else {
        const initialPool = createPool('New Charity Pool');
        const initialState: AppState = {
          pools: [initialPool],
          participants: [],
          activePoolId: initialPool.id,
          globalSettings: DEFAULT_GLOBAL_SETTINGS
        };
        set(ref(db, `users/${ownerUid}/state`), initialState);
        setState(initialState);
      }
      setIsFirebaseLoaded(true);
    });
  }, [ownerUid]);

  const activePool = useMemo(() => {
    if (!state || !state.pools) return null;
    // If a guest opened a per-contest public link (?p=<poolId>), pin to that pool
    if (urlPoolId && !isAdminAuthenticated) {
      const pinned = state.pools.find(p => p.id === urlPoolId);
      if (pinned) return pinned;
    }
    return state.pools.find(p => p.id === state.activePoolId) || state.pools[0];
  }, [state?.activePoolId, state?.pools, urlPoolId, isAdminAuthenticated]);

  const handleCopyContestLink = useCallback(() => {
    if (!ownerUid || !activePool) return;
    const url = `${window.location.origin}${window.location.pathname}?u=${ownerUid}&p=${activePool.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedContestId(activePool.id);
      setTimeout(() => setCopiedContestId(null), 2000);
    });
  }, [ownerUid, activePool]);

  // Global participants registry (may be migrated from per-pool participants)
  const globalParticipants = useMemo(() => (state?.participants || []), [state?.participants]);

  // Participants relevant to the active pool (derived from global registry and pool participants/squares)
  const participantsForActivePool = useMemo(() => {
    if (!activePool || !globalParticipants) return activePool?.participants || [];
    const idsInPool = new Set<string>((activePool.participants || []).map(p => p.id).concat((activePool.squares || []).filter(s => s.participantId).map(s => s.participantId!)));
    // include any global participant with boxes in this pool or explicitly listed in pool.participants
    return globalParticipants.filter(p => idsInPool.has(p.id) || (activePool.participants || []).some(pp => pp.id === p.id));
  }, [activePool, globalParticipants]);

  // Participants with an origin pool name (used by EntryModal quick-select)
  const globalParticipantsWithOrigin = useMemo(() => {
    if (!state) return [];
    const poolByParticipant = new Map<string, string>();
    (state.pools || []).forEach(pool => {
      (pool.participants || []).forEach(p => {
        if (!poolByParticipant.has(p.id)) poolByParticipant.set(p.id, pool.name || pool.id);
      });
    });
    return (globalParticipants || []).map(p => ({ ...p, originPoolName: poolByParticipant.get(p.id) }));
  }, [state, globalParticipants]);

  // Create a global participant and optionally ensure the active pool references it
  const handleCreateGlobalParticipant = useCallback((p: Participant) => {
    if (!state || !activePool || !ownerUid) return;
    const targetPoolId = state.pools.some(x => x.id === state.activePoolId) ? state.activePoolId : activePool.id;
    const poolIndex = state.pools.findIndex(x => x.id === targetPoolId);
    if (poolIndex === -1) return;
    const existing = (state.participants || []).find(pp => pp.id === p.id || (pp.email && pp.email.toLowerCase() === p.email?.toLowerCase()));
    const updates: any = {};
    const newGlobal = existing ? { ...existing, ...p } : p;
    const newGlobalList = [...(state.participants || []).filter(pp => pp.id !== newGlobal.id), newGlobal];
    updates[`users/${ownerUid}/state/participants`] = newGlobalList;

    // ensure pool.participants contains a reference (backwards-compat)
    const poolParticipants = [...(state.pools[poolIndex].participants || [])];
    if (!poolParticipants.find(pp => pp.id === newGlobal.id)) poolParticipants.push(newGlobal);
    updates[`users/${ownerUid}/state/pools/${poolIndex}/participants`] = poolParticipants;
    update(ref(db), updates).catch(err => console.error(err));
  }, [state, activePool, ownerUid]);

  const updateActivePool = useCallback((updates: Partial<Pool>) => {
    if (!state || !activePool || !ownerUid) return;
    const targetPoolId = state.pools.some(p => p.id === state.activePoolId) ? state.activePoolId : activePool.id;
    const poolIndex = state.pools.findIndex(p => p.id === targetPoolId);
    if (poolIndex === -1) return;
    update(ref(db, `users/${ownerUid}/state/pools/${poolIndex}`), updates)
      .catch(err => {
        console.error("Failed to update active pool:", err);
        alert(`Save Failed: ${err.message}`);
      });
  }, [state, activePool, ownerUid]);

  const updatePoolSettings = useCallback((newSettings: Partial<PoolSettings>) => {
    if (!state || !activePool || !ownerUid) return;
    const targetPoolId = state.pools.some(p => p.id === state.activePoolId) ? state.activePoolId : activePool.id;
    const poolIndex = state.pools.findIndex(p => p.id === targetPoolId);
    if (poolIndex === -1) return;
    update(ref(db, `users/${ownerUid}/state/pools/${poolIndex}/settings`), newSettings)
      .catch(err => {
        console.error("Failed to update pool settings:", err);
        alert(`Save Failed: ${err.message}`);
      });
  }, [state, activePool, ownerUid]);

  const updateGlobalSettings = useCallback((newSettings: Partial<GlobalSettings>) => {
    if (!state || !ownerUid) return;
    update(ref(db, `users/${ownerUid}/state/globalSettings`), newSettings)
      .catch(err => {
        console.error("Failed to update global settings:", err);
        alert(`Save Failed: ${err.message}`);
      });
  }, [state, ownerUid]);

  const atomicUpdateFinancials = useCallback((participantId: string, updatedParticipants: Participant[]) => {
    if (!state || !activePool || !ownerUid) return;
    const poolIndex = state.pools.findIndex(p => p.id === state.activePoolId);
    if (poolIndex === -1) return;

    const participant = updatedParticipants.find(p => p.id === participantId);
    if (!participant) return;

    const totalPaid = (participant.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
    const costPerBox = activePool.settings.costPerBox || 10;

    let remainingToDistribute = totalPaid;
    const updatedSquaresMap: Record<string, any> = {};

    (activePool.squares || []).forEach((sq, idx) => {
      if (sq.participantId === participantId) {
        const paymentForThisBox = Math.min(remainingToDistribute, costPerBox);
        remainingToDistribute = Math.max(0, remainingToDistribute - paymentForThisBox);
        updatedSquaresMap[`users/${ownerUid}/state/pools/${poolIndex}/squares/${idx}`] = {
          ...sq,
          paidAmount: paymentForThisBox,
          alias: participant.alias
        };
      }
    });

    const updates: any = {
      ...updatedSquaresMap,
      [`users/${ownerUid}/state/pools/${poolIndex}/participants`]: updatedParticipants
    };

    update(ref(db), updates).catch(err => console.error("Firebase atomic financial update failed:", err));
  }, [state, activePool, ownerUid]);

  const handleEntrySubmit = useCallback((data: Omit<Participant, 'id'>, squareIds: number[]) => {
    if (!state || !activePool || !ownerUid) return;
    const poolIndex = state.pools.findIndex(p => p.id === state.activePoolId);
    if (poolIndex === -1) return;

    // Use Alias as the sole unique identifier for an entry
    const normalize = (s: string) => (s || '').toLowerCase();
    let participant = (state.participants || []).find(p => normalize(p.alias) === normalize(data.alias) && data.alias);

    const newPoolParticipants = [...(activePool.participants || [])];
    const updates: any = {};

    if (!participant) {
      // create global participant and add to pool
      participant = { ...data, id: crypto.randomUUID(), paymentHistory: [] } as Participant;
      updates[`users/${ownerUid}/state/participants`] = [...(state.participants || []).filter(pp => pp.id !== participant!.id), participant];
      newPoolParticipants.push(participant);
      updates[`users/${ownerUid}/state/pools/${poolIndex}/participants`] = newPoolParticipants;
    } else {
      // ensure pool references this participant (back-compat)
      if (!newPoolParticipants.find(p => p.id === participant!.id)) {
        newPoolParticipants.push(participant!);
        updates[`users/${ownerUid}/state/pools/${poolIndex}/participants`] = newPoolParticipants;
      }
    }

    if (activePool.type === '13run' && selectedTeamId) {
      const gameData = activePool.gameData as ThirteenRunData;
      const newEntries = { ...(gameData?.entries || {}) };
      if (newEntries[selectedTeamId]) {
        newEntries[selectedTeamId] = {
          ...newEntries[selectedTeamId],
          participantId: participant!.id
        };
        updates[`users/${ownerUid}/state/pools/${poolIndex}/gameData/entries`] = newEntries;
      }
    } else {
      squareIds.forEach(sid => {
        updates[`users/${ownerUid}/state/pools/${poolIndex}/squares/${sid}`] = {
          ...(activePool.squares[sid] || {}),
          participantId: participant!.id,
          alias: (data.alias || participant!.alias || '').toUpperCase(),
          assigned: true
        };
      });
    }

    update(ref(db), updates).then(() => {
      if (participant) atomicUpdateFinancials(participant.id, newPoolParticipants);
    }).catch(err => console.error(err));

    setPendingSelection([]);
    setSelectedSquareId(null);
    setSelectedTeamId(null);
    setIsEntryModalOpen(false);
  }, [state, activePool, atomicUpdateFinancials, ownerUid, selectedTeamId]);

  const handleSquareClick = useCallback((id: number) => {
    if (!activePool) return;
    const sq = (activePool.squares || [])[id];
    if (sq?.assigned) {
      setSelectedSquareId(id);
      setIsEntryModalOpen(true);
    } else if (!activePool.settings?.isLocked) {
      setPendingSelection(prev =>
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
    }
  }, [activePool]);

  const handleTeamClick = useCallback((teamId: string) => {
    if (!activePool || activePool.type !== '13run') return;
    const entries = (activePool.gameData as ThirteenRunData)?.entries || {};
    const entry = entries[teamId];

    if (entry?.participantId) {
      // If claimed, maybe show info (optional)
      setSelectedTeamId(teamId);
      setIsEntryModalOpen(true);
    } else if (!activePool.settings?.isLocked) {
      setSelectedTeamId(teamId);
      setIsEntryModalOpen(true);
    }
  }, [activePool]);

  const handleUnassignSquare = useCallback((id: number) => {
    if (!state || !activePool || !ownerUid) return;
    const sq = activePool.squares[id];
    if (!sq || !sq.participantId) return;

    if (!window.confirm(`ARE YOU SURE?\n\nThis will remove the claim on Box #${id + 1}.`)) {
      return;
    }

    const poolIndex = state.pools.findIndex(p => p.id === state.activePoolId);
    if (poolIndex === -1) return;

    const participantId = sq.participantId;
    const participant = activePool.participants.find(p => p.id === participantId);
    const costPerBox = activePool.settings.costPerBox || 10;

    const updates: any = {};

    updates[`users/${ownerUid}/state/pools/${poolIndex}/squares/${id}`] = {
      ...sq,
      participantId: null,
      alias: '',
      assigned: false,
      paidAmount: 0
    };

    if (participant) {
      const totalPaid = (participant.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
      let remainingToDistribute = totalPaid;

      activePool.squares.forEach((otherSq, idx) => {
        if (idx === id) return;

        if (otherSq.participantId === participantId) {
          const paymentForThisBox = Math.min(remainingToDistribute, costPerBox);
          remainingToDistribute = Math.max(0, remainingToDistribute - paymentForThisBox);
          updates[`users/${ownerUid}/state/pools/${poolIndex}/squares/${idx}`] = {
            ...otherSq,
            paidAmount: paymentForThisBox
          };
        }
      });
    }

    update(ref(db), updates).then(() => {
      console.log(`Unassigned square ${id + 1} and redistributed payments.`);
    }).catch(err => {
      console.error("Failed to unassign square:", err);
      alert("Error removing name. Please try again.");
    });

    setIsEntryModalOpen(false);
    setSelectedSquareId(null);
  }, [state, activePool, ownerUid]);

  const handleClearUserBoxes = useCallback((participantId: string) => {
    if (!state || !activePool || !ownerUid) return;
    if (!window.confirm('Remove this participant from the contest and clear all their squares?')) return;

    const poolIndex = state.pools.findIndex(p => p.id === state.activePoolId);
    const updates: any = {};

    // 1. Clear the participant's squares in the active pool
    activePool.squares.forEach((sq, idx) => {
      if (sq.participantId === participantId) {
        updates[`users/${ownerUid}/state/pools/${poolIndex}/squares/${idx}`] = {
          ...sq,
          participantId: null,
          alias: '',
          assigned: false,
          paidAmount: 0
        };
      }
    });

    // 2. Remove from the active pool's participants sub-list only
    const filteredParticipants = (activePool.participants || []).filter(p => p.id !== participantId);
    updates[`users/${ownerUid}/state/pools/${poolIndex}/participants`] = filteredParticipants;

    update(ref(db), updates);
  }, [state, activePool, ownerUid]);

  const handleApplyPayment = useCallback((participantId: string, amount: number, method: string, note?: string) => {
    if (!state || !activePool) return;
    const newParticipants = activePool.participants.map(p => {
      if (p.id === participantId) {
        const transaction: any = { id: crypto.randomUUID(), amount, method, timestamp: Date.now() };
        if (note && note.trim() !== '') transaction.note = note.trim();
        return {
          ...p,
          paymentHistory: [...(p.paymentHistory || []), transaction]
        };
      }
      return p;
    });
    atomicUpdateFinancials(participantId, newParticipants);
  }, [state, activePool, atomicUpdateFinancials]);

  const handleEditPayment = useCallback((participantId: string, transactionId: string, amount: number, method: string, note?: string) => {
    if (!state || !activePool) return;
    const newParticipants = activePool.participants.map(p => {
      if (p.id === participantId) {
        return {
          ...p,
          paymentHistory: (p.paymentHistory || []).map(t => {
            if (t.id === transactionId) {
              const updated: any = { ...t, amount, method };
              if (note && note.trim() !== '') updated.note = note.trim();
              else delete updated.note;
              return updated;
            }
            return t;
          })
        };
      }
      return p;
    });
    atomicUpdateFinancials(participantId, newParticipants);
  }, [state, activePool, atomicUpdateFinancials]);

  const handleDeletePayment = useCallback((participantId: string, transactionId: string) => {
    if (!state || !activePool) return;
    const newParticipants = activePool.participants.map(p => {
      if (p.id === participantId) {
        return {
          ...p,
          paymentHistory: (p.paymentHistory || []).filter(t => t.id !== transactionId)
        };
      }
      return p;
    });
    atomicUpdateFinancials(participantId, newParticipants);
  }, [state, activePool, atomicUpdateFinancials]);

  const handleUpdateParticipant = useCallback((id: string, updates: Partial<Participant>) => {
    if (!state || !activePool || !ownerUid) return;
    const poolIndex = state.pools.findIndex(p => p.id === state.activePoolId);
    if (poolIndex === -1) return;

    const rootUpdates: Record<string, Participant> = {};

    const globalParticipantIndex = (state.participants || []).findIndex(p => p.id === id);
    if (globalParticipantIndex !== -1) {
      const existingGlobalParticipant = (state.participants || [])[globalParticipantIndex];
      rootUpdates[`users/${ownerUid}/state/participants/${globalParticipantIndex}`] = {
        ...existingGlobalParticipant,
        ...updates,
      };
    }

    const poolParticipantIndex = (activePool.participants || []).findIndex(p => p.id === id);
    if (poolParticipantIndex !== -1) {
      const existingPoolParticipant = (activePool.participants || [])[poolParticipantIndex];
      rootUpdates[`users/${ownerUid}/state/pools/${poolIndex}/participants/${poolParticipantIndex}`] = {
        ...existingPoolParticipant,
        ...updates,
      };
    }

    if (Object.keys(rootUpdates).length === 0) return;
    update(ref(db), rootUpdates).catch(err => alert(`Update Failed: ${err.message}`));
  }, [state, activePool, ownerUid]);

  const handleGenerateNumbers = useCallback(() => {
    const shuffle = () => Array.from({ length: 10 }, (_, i) => i).sort(() => Math.random() - 0.5);
    updatePoolSettings({ rowNumbers: shuffle(), colNumbers: shuffle() });
  }, [updatePoolSettings]);

  const handleAddScore = useCallback((score: ScoreEntry) => {
    if (!activePool) return;
    const newScores = [...(activePool.scores || []), score];
    updateActivePool({ scores: newScores });
  }, [activePool, updateActivePool]);

  const handleUpdateScore = useCallback((score: ScoreEntry) => {
    if (!activePool) return;
    const newScores = (activePool.scores || []).map(s => s.id === score.id ? score : s);
    updateActivePool({ scores: newScores });
  }, [activePool, updateActivePool]);

  const handleDeleteScore = useCallback((id: string) => {
    if (!activePool) return;
    const newScores = (activePool.scores || []).filter(s => s.id !== id);
    updateActivePool({ scores: newScores });
  }, [activePool, updateActivePool]);

  const handleResetGrid = useCallback(() => {
    if (window.confirm("ARE YOU SURE? This will clear all boxes for the active grid.")) {
      updateActivePool({
        squares: createNewSquares(),
        participants: [],
        scores: [],
        settings: { ...activePool!.settings, isLocked: false, rowNumbers: Array(10).fill(null), colNumbers: Array(10).fill(null) }
      });
    }
  }, [activePool, updateActivePool]);

  const handleCreatePool = useCallback((name: string, type: PoolType = 'squares', customSettings?: Partial<PoolSettings>) => {
    if (!state || !ownerUid) return;
    const newPool = createPool(name, type, { ...DEFAULT_POOL_SETTINGS, ...customSettings });
    const newPools = [...state.pools, newPool];
    set(ref(db, `users/${ownerUid}/state`), { ...state, pools: newPools, activePoolId: newPool.id })
      .catch(err => alert(`Create Pool Failed: ${err.message}`));
  }, [state, ownerUid]);

  const handleSwitchPool = useCallback((id: string) => {
    if (!state || !ownerUid) return;
    if (isAdminAuthenticated) {
      update(ref(db, `users/${ownerUid}/state`), { activePoolId: id })
        .catch(err => alert(`Switch Failed: ${err.message}`));
    } else {
      const params = new URLSearchParams(window.location.search);
      params.set('p', id);
      const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      window.history.pushState(null, '', newUrl);
      setUrlPoolId(id);
    }
  }, [state, ownerUid, isAdminAuthenticated]);

  const handleDeletePool = useCallback((id: string) => {
    if (!state || state.pools.length <= 1 || !ownerUid) return;
    if (window.confirm("Permanently delete this contest?")) {
      const newPools = state.pools.filter(p => p.id !== id);
      set(ref(db, `users/${ownerUid}/state`), { ...state, pools: newPools, activePoolId: newPools[0].id });
    }
  }, [state, ownerUid]);

  const handleImportState = useCallback((newState: AppState) => {
    if (!ownerUid) return;
    set(ref(db, `users/${ownerUid}/state`), newState);
  }, [ownerUid]);

  const handleLegacyPasswordAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPass = state?.globalSettings?.adminPassword || 'admin';
    if (passwordInput === adminPass) {
      setIsAdminAuthenticated(true);
      window.sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (isRegistering) {
      createUserWithEmailAndPassword(auth, authEmail, authPassword)
        .then(() => {
          setIsAdminAuthenticated(true);
          window.sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
          setAuthEmail('');
          setAuthPassword('');
        })
        .catch(err => setAuthError(err.message));
    } else {
      signInWithEmailAndPassword(auth, authEmail, authPassword)
        .then(() => {
          setIsAdminAuthenticated(true);
          window.sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
          setAuthEmail('');
          setAuthPassword('');
        })
        .catch(err => setAuthError(err.message));
    }
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      setIsAdminAuthenticated(false);
      window.sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
      setActiveTab('grid');
    });
  };

  if (!isFirebaseLoaded) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
        <h2 className="text-white font-black uppercase tracking-widest text-sm">Initializing Charity Grid...</h2>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans selection:bg-indigo-100 overflow-hidden print:h-auto print:overflow-visible">
      <header className="bg-indigo-900 text-white p-6 md:p-8 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="w-24 h-24 md:w-16 md:h-16 bg-white rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setActiveTab('grid')}>
              <img
                src={headerLogoSrc}
                alt={state.globalSettings.charityName}
                className="w-20 h-20 md:w-14 md:h-14 object-contain"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  setHeaderLogoSrc(getHeaderLogoFallback(state.globalSettings.charityName));
                }}
              />
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-3">
                {isAdminAuthenticated ? (
                  <select
                    title="Active contest"
                    value={activePool?.id || state.activePoolId}
                    onChange={(e) => handleSwitchPool(e.target.value)}
                    className="bg-indigo-800 text-white border-none rounded-xl px-4 py-1.5 font-black uppercase text-sm md:text-xl tracking-tighter outline-none focus:ring-2 focus:ring-indigo-400 max-w-full cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    {state.pools.map(p => (
                      <option key={p.id} value={p.id}>{(p.name || 'Untitled Pool').toUpperCase()}</option>
                    ))}
                  </select>
                ) : (
                  <h2 className="text-white font-black uppercase text-sm md:text-xl tracking-tighter select-none py-1">
                    {(activePool?.name || 'Charity Contest').toUpperCase()}
                  </h2>
                )}

                {ownerUid && activePool && (
                  <button
                    onClick={handleCopyContestLink}
                    title="Copy unique link to this contest"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-850 hover:bg-indigo-750 border border-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-white shadow-md"
                  >
                    <i className={`fas ${copiedContestId === activePool.id ? 'fa-check text-green-400' : 'fa-link text-indigo-300'}`}></i>
                    <span className="hidden sm:inline">
                      {copiedContestId === activePool.id ? 'Copied!' : 'Copy Link'}
                    </span>
                  </button>
                )}

                {(liveScores.nfl.length > 0 || liveScores.mlb.length > 0) && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest hidden md:inline">Live</span>
                  </div>
                )}

                {isAdminAuthenticated && (
                  <div className="hidden lg:flex items-center gap-3 ml-4 bg-black/20 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-white/90 leading-none mb-1 truncate max-w-[120px]">{authUser?.email || 'Admin'}</span>
                      <button onClick={() => { signOut(auth); setIsAdminAuthenticated(false); window.sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY); }} className="text-[8px] font-black uppercase text-amber-300 hover:text-white transition-colors text-left">Sign Out</button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] md:text-xs text-indigo-300 font-bold uppercase tracking-widest mt-1 truncate">Benefiting {state.globalSettings.charityName}</p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <nav className="flex flex-wrap justify-center gap-1 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md">
              {(() => {
                const gameTab = { id: 'grid', icon: 'fa-th', label: 'Board' };
                if (activePool?.type === 'survivor') {
                  gameTab.id = 'survivor';
                  gameTab.icon = 'fa-football-ball';
                  gameTab.label = 'Survivor';
                } else if (activePool?.type === '13run') {
                  gameTab.id = '13run';
                  gameTab.icon = 'fa-baseball-ball';
                  gameTab.label = '13-Run';
                }

                 const showAdminTab = isAdminAuthenticated || showAdminOption;

                const tabs: Array<{ id: Tab; icon: string; label: string }> = [
                  gameTab as any,
                  { id: 'winners', icon: 'fa-trophy', label: 'Winners' },
                  { id: 'player', icon: 'fa-user-check', label: 'My Entry' }
                ];

                if (showAdminTab) {
                  tabs.push({ id: 'admin', icon: 'fa-lock', label: 'Admin' });
                }

                return tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-indigo-900 shadow-lg' : 'hover:bg-white/10 text-white/70'}`}
                  >
                    <i className={`fas ${tab.icon} text-[10px]`}></i> <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ));
              })()}
              <button title="Open help" onClick={() => setIsHelpModalOpen(true)} className="w-10 h-10 rounded-xl text-white/50 hover:text-white flex items-center justify-center">
                <i className="fas fa-question-circle"></i>
              </button>
            </nav>

            {/* Mobile Log Out */}
            {isAdminAuthenticated && (
              <div className="flex lg:hidden items-center gap-2 px-2 mt-2">
                <span className="text-[8px] font-bold text-indigo-300 uppercase truncate max-w-[100px]">{authUser?.email || 'Admin'}</span>
                <button onClick={() => { signOut(auth); setIsAdminAuthenticated(false); window.sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY); }} className="text-[8px] font-black text-amber-400 uppercase tracking-widest underline underline-offset-4">Log Out</button>
              </div>
            )}
          </div>
        </div>
      </header>


      <main ref={mainRef} className="flex-1 min-h-0 max-w-7xl mx-auto w-full p-4 md:p-8 overflow-y-auto overflow-x-hidden">


        {activeTab === 'grid' && (activePool?.type === 'squares' || !activePool?.type) && (
          (!state || !state.pools || state.pools.length === 0) ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] shadow-xl border-4 border-indigo-50 mt-10">
              <div className="w-24 h-24 bg-indigo-900 rounded-[2rem] flex items-center justify-center text-white text-4xl mb-8 shadow-2xl animate-bounce">
                <i className="fas fa-hand-holding-heart"></i>
              </div>
              <h1 className="text-3xl font-black text-indigo-900 uppercase tracking-tight mb-4">Welcome to CharityPools</h1>
              <p className="max-w-md text-gray-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed mb-10">
                You are currently in guest mode. To view your pool, please use the direct link provided by your charity group, or sign in to your admin account.
              </p>
              <button onClick={() => setActiveTab('admin')} className="px-10 py-5 bg-indigo-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all transform hover:scale-105">
                Admin Sign In
              </button>
            </div>
          ) : activePool && (
            <div id="printable-area">
              <Grid
                squares={activePool?.squares || []}
                pendingSelection={pendingSelection}
                settings={{ ...state.globalSettings, ...(activePool?.settings || DEFAULT_POOL_SETTINGS) }}
                onSquareClick={handleSquareClick}
                participants={participantsForActivePool}
                onCheckout={() => setIsEntryModalOpen(true)}
                onSetPendingSelection={setPendingSelection}
                activePool={activePool}
              />
            </div>
          )
        )}

        {activeTab === 'survivor' && activePool?.type === 'survivor' && (
          <Suspense fallback={<div className="p-12 text-center font-black uppercase text-indigo-300">Loading Survivor Engine...</div>}>
            <SurvivorEngine
              pool={activePool}
              participants={activePool.participants || []}
              isAdmin={isAdminAuthenticated}
              onUpdateGameData={(gameData) => updateActivePool({ gameData: { ...(activePool.gameData as SurvivorData), ...gameData } })}
              liveScores={liveScores}
            />
          </Suspense>
        )}

        {activeTab === '13run' && activePool?.type === '13run' && (
          <Suspense fallback={<div className="p-12 text-center font-black uppercase text-indigo-300">Loading 13-Run Engine...</div>}>
            <ThirteenRunEngine
              pool={activePool}
              participants={activePool.participants || []}
              isAdmin={isAdminAuthenticated}
              onUpdateGameData={(gameData) => updateActivePool({ gameData: { ...(activePool.gameData as ThirteenRunData), ...gameData } })}
              liveScores={liveScores}
              onTeamClick={handleTeamClick}
            />
          </Suspense>
        )}

        {activeTab === 'winners' && activePool && (
          <Suspense fallback={<div className="p-6 text-center text-gray-500 font-bold uppercase text-xs">Loading winners...</div>}>
            <Winners
              activePool={activePool}
              settings={{ ...state.globalSettings, ...(activePool?.settings || DEFAULT_POOL_SETTINGS) }}
              onAddScore={handleAddScore}
              onUpdateScore={handleUpdateScore}
              onDeleteScore={handleDeleteScore}
              isAdmin={false}
            />
          </Suspense>
        )}

        {activeTab === 'player' && (
          <Suspense fallback={<div className="p-6 text-center text-gray-500 font-bold uppercase text-xs">Loading profile...</div>}>
            <PlayerProfile state={state} />
          </Suspense>
        )}


        {activeTab === 'admin' && (
          !isAdminAuthenticated ? (
            <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-indigo-50">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><i className="fas fa-lock"></i></div>
              <h2 className="text-xl font-black text-indigo-900 uppercase mb-2">Admin Access</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-8">
                {isRegistering ? 'Create your platform account' : 'Sign in to manage your pools'}
              </p>

              <form onSubmit={handleAdminAuth} className="space-y-4">
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-center font-black outline-none border-2 transition-all focus:border-indigo-500 border-transparent"
                  placeholder="admin@email.com"
                  required
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-center font-black outline-none border-2 transition-all focus:border-indigo-500 border-transparent"
                  placeholder="••••••••"
                  required
                />

                {authError && <p className="text-red-500 text-[10px] font-bold uppercase">{authError}</p>}

                <button type="submit" className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">
                  {isRegistering ? 'Create Account' : 'Secure Sign In'}
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-[1px] bg-gray-100"></div>
                  <span className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-[1px] bg-gray-100"></div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { googleProvider } = await import('./firebase');
                      const { signInWithPopup } = await import('firebase/auth');
                      
                      const result = await signInWithPopup(auth, googleProvider);
                      if (result.user) {
                        setIsAdminAuthenticated(true);
                        window.sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
                        setAuthError('');
                      }
                    } catch (err: any) {
                      window.sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
                      if (err.code === 'auth/unauthorized-domain') {
                        setAuthError(`Local Login Blocked: Ensure "localhost" is in your Firebase Authorized Domains (Authentication > Settings).`);
                      } else if (err.code === 'auth/popup-closed-by-user') {
                        setAuthError('Login cancelled: Popup was closed.');
                      } else {
                        setAuthError(`Login Error (${err.code}): ${err.message}`);
                      }
                    }
                  }}
                  className="w-full py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all text-xs"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                  SIGN IN WITH GOOGLE
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthError('');
                  }}
                  className="text-indigo-600 text-[10px] font-bold uppercase mt-4 hover:underline"
                >
                  {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
              </form>

              {/* Legacy Access — for users with old direct password */}
              <div className="mt-12 pt-8 border-t border-gray-100">
                <p className="text-[8px] text-gray-300 font-bold uppercase mb-4">Legacy Access</p>
                <form onSubmit={handleLegacyPasswordAuth} className="flex gap-2">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-center text-[10px] font-black outline-none border-2 border-transparent focus:border-gray-200"
                    placeholder="LEGACY PASSWORD"
                  />
                  <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] hover:bg-gray-200">Go</button>
                </form>
              </div>
            </div>
          ) : (
            <Suspense fallback={<div className="p-6 text-center text-gray-500 font-bold uppercase text-xs">Loading admin panel...</div>}>
              <AdminPanel
                activePoolId={state.activePoolId}
                activePool={activePool}
                poolSettings={activePool?.settings || DEFAULT_POOL_SETTINGS}
                globalSettings={state.globalSettings}
                onUpdatePoolSettings={updatePoolSettings}
                onUpdateActivePool={updateActivePool}
                onUpdateGlobalSettings={updateGlobalSettings}
                onResetGrid={handleResetGrid}
                onDeletePool={handleDeletePool}
                onGenerateNumbers={handleGenerateNumbers}
                squares={activePool?.squares || []}
                participants={participantsForActivePool}
                allParticipants={globalParticipants}
                onCreateGlobalParticipant={handleCreateGlobalParticipant}
                onUpdateSquare={(id, up) => update(ref(db, `users/${ownerUid}/state/pools/${state.pools.findIndex(p => p.id === state.activePoolId)}/squares/${id}`), up)}
                onUpdateParticipant={handleUpdateParticipant}
                onUnassignSquare={handleUnassignSquare}
                onClearUserBoxes={handleClearUserBoxes}
                onApplyPayment={handleApplyPayment}
                onEditPayment={handleEditPayment}
                onDeletePayment={handleDeletePayment}
                onAddScore={handleAddScore}
                onUpdateScore={handleUpdateScore}
                onDeleteScore={handleDeleteScore}
                scores={activePool?.scores || []}
                pools={state.pools}
                onSwitchPool={handleSwitchPool}
                onCreatePool={handleCreatePool}
                fullState={state}
                onImportState={handleImportState}
                ownerUid={ownerUid}
                onSignOut={handleSignOut}
              />
            </Suspense>
          )
        )}

        {/* Rules Banner — shown when rules have been entered for this contest, and we are viewing a contest tab */}
        {activePool && ['grid', 'survivor', '13run'].includes(activeTab) && activePool.settings?.rules?.trim() && (
          <div className="w-full max-w-5xl mx-auto mt-6 px-2">
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl p-5 shadow-xl border border-indigo-700/50 relative overflow-hidden">
              {/* decorative background icon */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/5 text-[80px] pointer-events-none select-none">
                <i className="fas fa-scroll"></i>
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="flex-shrink-0 w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                  <i className="fas fa-scroll text-amber-300 text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-2">Pool Rules</h3>
                  <ul className="space-y-1">
                    {(activePool.settings.rules || '').split('\n').filter(line => line.trim()).map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/90 text-xs font-medium leading-snug">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{line.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 p-8 text-center text-gray-400 print:hidden flex flex-col items-center justify-center relative">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">{state.globalSettings.charityName}</p>
        <p className="text-[9px] font-medium uppercase tracking-widest flex items-center justify-center gap-2">
          Powered by Charity Squares Engine • {new Date().getFullYear()}
          <button 
            type="button"
            onClick={() => {
              const newShowAdmin = !showAdminOption;
              setShowAdminOption(newShowAdmin);
              const url = new URL(window.location.href);
              if (newShowAdmin) {
                url.searchParams.set('admin', 'true');
              } else {
                url.searchParams.delete('admin');
              }
              window.history.replaceState({}, '', url.toString());
              setActiveTab('admin');
            }} 
            className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer p-1.5 ml-2"
            title="Admin Access Toggle"
          >
            <i className="fas fa-lock text-sm"></i>
          </button>
        </p>
      </footer>

      {/* Pass a deduplicated list of participants from ALL pools so the EntryModal can quick-select across contests */}
      {activePool && (
        <Suspense fallback={null}>
          <EntryModal
            isOpen={isEntryModalOpen}
            onClose={() => { setIsEntryModalOpen(false); setSelectedSquareId(null); setSelectedTeamId(null); }}
            onSubmit={handleEntrySubmit}
            onUnassign={handleUnassignSquare}
            onSetPendingSelection={setPendingSelection}
            selectedSquareIds={selectedSquareId !== null ? [selectedSquareId] : pendingSelection}
            selectedTeamId={selectedTeamId}
            activePool={activePool}
            existingParticipants={globalParticipantsWithOrigin}
            settings={{ ...state.globalSettings, ...(activePool?.settings || DEFAULT_POOL_SETTINGS) }}
            isAdmin={isAdminAuthenticated}
          />
        </Suspense>
      )}

      {/* ShareModal removed from App — share UI retained in components/ if needed */}
      <Suspense fallback={null}>
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      </Suspense>

      {activePool && (
        <Suspense fallback={null}>
          <AIAssistant globalSettings={state.globalSettings} activePool={activePool} />
        </Suspense>
      )}

    </div>
  );
};

export default App;
