import { AppState, Pool } from '../types';

export const resolveTargetPoolId = (state: AppState | null, activePool: Pool | null) => {
    if (!state) return null;

    if (activePool?.id && state.pools.some(p => p.id === activePool.id)) {
        return activePool.id;
    }

    if (state.activePoolId && state.pools.some(p => p.id === state.activePoolId)) {
        return state.activePoolId;
    }

    return activePool?.id || state.activePoolId || null;
};

