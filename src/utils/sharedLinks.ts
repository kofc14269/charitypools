import { Pool, Tab } from '../types';

export function buildSharedLink(ownerUid: string, poolId?: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('u', ownerUid);
  if (poolId) url.searchParams.set('p', poolId);
  return url.toString();
}

export function resolveSharedPool(pools: Pool[], activePoolId: string, linkedPoolId: string | null) {
  return pools.find(pool => pool.id === linkedPoolId)
    || pools.find(pool => pool.id === activePoolId) || pools[0];
}

export function getContestTab(pool: Pool): Tab {
  return pool.type === 'squares' ? 'grid' : pool.type as Tab;
}

export async function copySharedLink(url: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
  } catch { /* Some browsers deny clipboard access; try the selection fallback. */ }
  const field = document.createElement('textarea');
  field.value = url;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  const previousFocus = document.activeElement as HTMLElement | null;
  try {
    field.select();
    if (!document.execCommand?.('copy')) throw new Error('Copy unavailable');
  } finally {
    field.remove();
    previousFocus?.focus();
  }
}
