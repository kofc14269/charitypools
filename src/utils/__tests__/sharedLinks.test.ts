import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildSharedLink, copySharedLink, getContestTab, resolveSharedPool } from '../sharedLinks';
import { Pool } from '../../types';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

describe('shared contest links', () => {
  const pools = [
    { id: 'squares', type: 'squares' },
    { id: 'survivor', type: 'survivor' },
    { id: 'baseball', type: '13run' },
  ] as Pool[];

  test.each([['squares', 'grid'], ['survivor', 'survivor'], ['baseball', '13run']])('opens linked %s in the matching view', (id, tab) => {
    const selected = resolveSharedPool(pools, 'squares', id);
    expect(selected.id).toBe(id);
    expect(getContestTab(selected)).toBe(tab);
  });

  test('uses an explicit link even when the account has another active contest', () => {
    expect(resolveSharedPool(pools, 'survivor', 'baseball').id).toBe('baseball');
    expect(resolveSharedPool(pools, 'survivor', null).id).toBe('survivor');
  });

  test('encodes identifiers and removes old admin and contest parameters', () => {
    window.history.replaceState({}, '', '/?admin=true&u=old&p=old#section');
    const url = new URL(buildSharedLink('owner', 'Pool & Friends'));
    expect(url.searchParams.get('p')).toBe('Pool & Friends');
    expect(url.searchParams.get('u')).toBe('owner');
    expect(url.searchParams.has('admin')).toBe(false);
    expect(url.hash).toBe('');
  });

  test('uses fallback when clipboard permission is denied and cleans up', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    const copy = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: copy });
    await copySharedLink('https://example.com/?u=owner&p=pool');
    expect(copy).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    copy.mockReturnValue(false);
    await expect(copySharedLink('https://example.com')).rejects.toThrow('Copy unavailable');
  });
});
