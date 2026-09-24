import { Database, get, onValue, ref } from 'firebase/database';

// Match the public leaf paths in the deployed database rules. Never request
// the parent state/pools nodes or participant/payment registries as a visitor.
const GLOBAL_FIELDS = ['charityName', 'teamALogo', 'teamBLogo', 'zelleAccount', 'paypalAccount', 'paypalLink', 'venmoAccount', 'otherPaymentInfo', 'reservationNotificationEmail', 'reservationNotificationsEnabled'];
const POOL_FIELDS = ['id', 'name', 'type', 'sport', 'createdAt', 'settings', 'scores', 'gameData', 'squares'];

export function subscribePublicState(db: Database, ownerUid: string, guestUid: string | null,
  receive: (state: any) => void, fail: (error: Error) => void): () => void {
  const base = `users/${ownerUid}/state`;
  let stopped = false;
  let generation = 0;
  let subscriptions: Array<() => void> = [];
  const stopCount = onValue(ref(db, `${base}/poolCount`), async countSnapshot => {
    const current = ++generation;
    subscriptions.forEach(stop => stop());
    subscriptions = [];
    try {
      const count = countSnapshot.val();
      const ids: string[] = [];
      // Older accounts do not have poolCount. Their pools are a dense array;
      // discover its IDs using the explicitly public id field only.
      for (let index = 0; count == null || index < count; index++) {
        const id = (await get(ref(db, `${base}/pools/${index}/id`))).val();
        if (stopped || current !== generation) return;
        if (!id) break;
        ids.push(id);
      }
      const state: any = { pools: ids.map(id => ({ id, participants: [] })), participants: [], globalSettings: {}, activePoolId: ids[0] || '' };
      const fields: Array<{ path: string; target: any; key: string }> = [
        { path: 'activePoolId', target: state, key: 'activePoolId' },
        ...GLOBAL_FIELDS.map(key => ({ path: `globalSettings/${key}`, target: state.globalSettings, key })),
        ...ids.flatMap((_, index) => POOL_FIELDS.map(key => ({ path: `pools/${index}/${key}`, target: state.pools[index], key }))),
      ];
      if (guestUid) {
        state.guestParticipants = {};
        fields.push({ path: `guestParticipants/${guestUid}`, target: state.guestParticipants, key: guestUid });
      }
      const pending = new Set(fields.map(field => field.path));
      fields.forEach(({ path, target, key }) => {
        subscriptions.push(onValue(ref(db, `${base}/${path}`), snapshot => {
          if (stopped || current !== generation) return;
          const value = snapshot.val();
          if (value != null) target[key] = value;
          else delete target[key];
          pending.delete(path);
          if (pending.size === 0) receive(structuredClone(state));
        }, error => { if (!stopped && current === generation) fail(error); }));
      });
    } catch (error) {
      if (!stopped && current === generation) fail(error as Error);
    }
  }, error => { if (!stopped) fail(error); });
  return () => { stopped = true; generation++; stopCount(); subscriptions.forEach(stop => stop()); };
}
