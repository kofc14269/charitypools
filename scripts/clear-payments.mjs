/**
 * clear-payments.mjs
 * One-time migration: clears all paymentHistory from every participant
 * in every pool, and resets paidAmount to 0 on every square.
 *
 * Usage:
 *   node scripts/clear-payments.mjs <adminPassword>
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAZF464USpdS6rQNUL1w_-715Rv29GHMw8',
  authDomain: 'st-bernard-kofc-superbowl-grid.firebaseapp.com',
  databaseURL: 'https://st-bernard-kofc-superbowl-grid-default-rtdb.firebaseio.com',
  projectId: 'st-bernard-kofc-superbowl-grid',
  storageBucket: 'st-bernard-kofc-superbowl-grid.firebasestorage.app',
  messagingSenderId: '619277918232',
  appId: '1:619277918232:web:4cbdf203d06471d563636d',
};

const ADMIN_EMAIL = 'kofc14269@gmail.com';
const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/clear-payments.mjs <adminPassword>');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

async function run() {
  console.log(`Signing in as ${ADMIN_EMAIL}...`);
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
  const uid = cred.user.uid;
  console.log(`Signed in. UID: ${uid}`);

  const stateRef = ref(db, `users/${uid}/state`);
  const snap = await get(stateRef);
  if (!snap.exists()) {
    console.log('No state found for this user. Nothing to do.');
    process.exit(0);
  }

  const state = snap.val();
  const pools = Array.isArray(state.pools)
    ? state.pools
    : Object.values(state.pools || {});

  const updates = {};
  let participantCount = 0;
  let squareCount = 0;

  pools.forEach((pool, poolIndex) => {
    // Clear paymentHistory on every pool-level participant
    const participants = Array.isArray(pool.participants)
      ? pool.participants
      : Object.values(pool.participants || {});

    participants.forEach((p, pIndex) => {
      if ((p.paymentHistory || []).length > 0) {
        updates[`users/${uid}/state/pools/${poolIndex}/participants/${pIndex}/paymentHistory`] = [];
        participantCount++;
      }
    });

    // Reset paidAmount to 0 on every square
    const squares = Array.isArray(pool.squares)
      ? pool.squares
      : Object.values(pool.squares || {});

    squares.forEach((sq, sqIndex) => {
      if ((sq.paidAmount || 0) !== 0) {
        updates[`users/${uid}/state/pools/${poolIndex}/squares/${sqIndex}/paidAmount`] = 0;
        squareCount++;
      }
    });
  });

  // Also clear paymentHistory from the top-level global participants registry
  const globalParticipants = Array.isArray(state.participants)
    ? state.participants
    : Object.values(state.participants || {});

  globalParticipants.forEach((p, pIndex) => {
    if ((p.paymentHistory || []).length > 0) {
      updates[`users/${uid}/state/participants/${pIndex}/paymentHistory`] = [];
      participantCount++;
    }
  });

  if (Object.keys(updates).length === 0) {
    console.log('Nothing to clear — all payment histories are already empty.');
    process.exit(0);
  }

  console.log(`Clearing ${participantCount} paymentHistory arrays and ${squareCount} square paidAmounts...`);
  await update(ref(db), updates);
  console.log('Done! All payment history cleared.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
