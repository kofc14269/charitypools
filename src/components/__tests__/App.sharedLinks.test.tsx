import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../../App';

const fixture = vi.hoisted(() => ({ user: null as any, type: 'squares', paths: [] as string[], defer: false, deliver: null as null | (() => void) }));
vi.mock('../../firebase', () => ({ db: {}, auth: {}, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_: unknown, callback: any) => { callback(fixture.user); return () => {}; },
  signInAnonymously: vi.fn().mockResolvedValue({}),
  signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(), signInWithPopup: vi.fn(), signOut: vi.fn(),
}));
vi.mock('firebase/database', () => {
  const valueAt = (path: string) => {
    const data = { activePoolId: 'other', globalSettings: { charityName: 'Test Charity' }, participants: [],
      pools: [
        { id: 'other', name: 'Other Contest', type: 'squares', participants: [], squares: [], settings: {} },
        { id: 'shared', name: 'Shared Contest', type: fixture.type, participants: [], squares: [], settings: {} },
      ] };
    return path.split('/').slice(3).reduce((value: any, key) => value?.[key], data) ?? null;
  };
  return {
    ref: (_: unknown, path: string) => path,
    onValue: (path: string, callback: any, failure: any) => {
      fixture.paths.push(path);
      if (path === 'users/owner/state' && fixture.user?.uid !== 'owner') {
        failure(new Error('Permission denied for private parent record'));
        return () => {};
      }
      const deliver = () => callback({ val: () => valueAt(path) });
      if (fixture.defer && (path.endsWith('/poolCount') || path.endsWith('/state'))) fixture.deliver = deliver;
      else deliver();
      return () => {};
    },
    get: async (path: string) => { fixture.paths.push(path); return { val: () => valueAt(path) }; },
    set: vi.fn(), update: vi.fn(),
  };
});
vi.mock('../../services/sportsApi', () => ({ fetchScores: vi.fn().mockResolvedValue([]) }));
vi.mock('../Grid', () => ({ default: () => <div>Public squares board</div> }));
vi.mock('../SurvivorEngine', () => ({ default: () => <div>Public survivor board</div> }));
vi.mock('../ThirteenRunEngine', () => ({ default: () => <div>Public baseball board</div> }));
afterEach(() => { window.sessionStorage.clear(); window.history.replaceState({}, '', '/'); fixture.paths = []; fixture.defer = false; fixture.deliver = null; });

test.each([['squares', 'Public squares board'], ['survivor', 'Public survivor board'], ['13run', 'Public baseball board']])(
  'signed-out visitor opens %s without admin sign-in', async (type, label) => {
    fixture.user = null;
    fixture.type = type;
    window.history.replaceState({}, '', '/?u=owner&p=shared');
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => { root.render(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
    expect(container.textContent).toContain(label);
    expect(container.textContent).not.toContain('Sign in to manage your pools');
    expect((container.querySelector('select[aria-label="Select pool"]') as HTMLSelectElement).value).toBe('shared');
    expect(fixture.paths).toContain('users/owner/state/pools/1/squares');
    expect(fixture.paths).not.toContain('users/owner/state');
    expect(fixture.paths.some(path => path.endsWith('/participants'))).toBe(false);
    await act(async () => root.unmount());
  }
);

test('an existing admin session still opens the contest specified by the shared link', async () => {
  fixture.type = 'squares';
  fixture.user = { uid: 'different-owner', email: 'admin@example.com' };
  window.sessionStorage.setItem('charitypools-admin-authenticated', 'true');
  window.history.replaceState({}, '', '/?u=owner&p=shared&admin=true');
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(<App />));
  expect(container.textContent).toContain('Public squares board');
  expect((container.querySelector('select[aria-label="Select pool"]') as HTMLSelectElement).value).toBe('shared');
  expect(fixture.paths).toContain('users/owner/state/pools/1/squares');
    expect(fixture.paths).not.toContain('users/owner/state');
    expect(fixture.paths.some(path => path.endsWith('/participants'))).toBe(false);
  await act(async () => root.unmount());
});

test('shared link shows loading instead of admin sign-in while the database is pending', async () => {
  fixture.user = null;
  fixture.type = 'squares';
  fixture.defer = true;
  window.history.replaceState({}, '', '/?u=owner&p=shared');
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(<App />));
  expect(container.textContent).toContain('Initializing Charity Grid');
  expect(container.textContent).not.toContain('Admin Sign In');
  expect(container.textContent).not.toContain('Welcome to CharityPools');
  await act(async () => fixture.deliver!());
  expect(container.textContent).toContain('Public squares board');
  expect((container.querySelector('select[aria-label="Select pool"]') as HTMLSelectElement).value).toBe('shared');
  await act(async () => root.unmount());
});
