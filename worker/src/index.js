import { createRemoteJWKSet, jwtVerify } from "jose";

const firebaseKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Content-Type": "application/json",
    "Vary": "Origin",
  },
});

const preflight = origin => new Response(null, {
  status: 204,
  headers: {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  },
});

const clean = (value, maxLength = 200) => String(value || "").trim().slice(0, maxLength);

const getPoolState = async (env, ownerUid) => {
  const url = `https://${env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/users/${encodeURIComponent(ownerUid)}/state.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Firebase lookup failed (${response.status})`);
  return response.json();
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = new Set(env.ALLOWED_ORIGINS.split(",").map(value => value.trim()));
    if (!allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
    if (request.method === "OPTIONS") return preflight(origin);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

    const authorization = request.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401, origin);

    let claims;
    try {
      ({ payload: claims } = await jwtVerify(authorization.slice(7), firebaseKeys, {
        audience: env.FIREBASE_PROJECT_ID,
        issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      }));
    } catch {
      return json({ error: "Invalid authentication token" }, 401, origin);
    }

    const payload = await request.json();
    const ownerUid = clean(payload.ownerUid, 128);
    const isAnonymous = claims.firebase?.sign_in_provider === "anonymous";
    if (claims.sub !== ownerUid && claims.email !== "kofc14269@gmail.com" && !isAnonymous) {
      return json({ error: "Not authorized for this pool" }, 403, origin);
    }

    const boxes = Array.isArray(payload.boxes) ? payload.boxes.slice(0, 100) : [];
    const participant = payload.participant || {};
    const participantId = clean(participant.id, 128);
    const poolId = clean(payload.poolId, 128);
    if (!participantId || !poolId || !boxes.length) {
      return json({ error: "Invalid notification details" }, 400, origin);
    }

    let state;
    try {
      state = await getPoolState(env, ownerUid);
    } catch (error) {
      console.error(JSON.stringify({ event: "firebase_lookup_failed", message: error.message }));
      return json({ error: "Could not verify reservation" }, 502, origin);
    }

    const pools = Array.isArray(state?.pools) ? state.pools : Object.values(state?.pools || {});
    const pool = pools.find(candidate => candidate?.id === poolId);
    const configuredRecipient = clean(
      state?.globalSettings?.reservationNotificationEmail || "kofcsuperbowl@gmail.com",
      254,
    );
    if (!pool || pool.settings?.isLocked || state?.globalSettings?.reservationNotificationsEnabled === false || !emailPattern.test(configuredRecipient)) {
      return json({ error: "Notifications are not available for this pool" }, 403, origin);
    }

    const storedParticipants = Array.isArray(pool.participants) ? pool.participants : Object.values(pool.participants || {});
    const storedParticipant = state?.guestParticipants?.[participantId]
      || storedParticipants.find(candidate => candidate?.id === participantId);
    const storedSquares = Array.isArray(pool.squares) ? pool.squares : pool.squares || {};
    const verifiedBoxes = boxes.map(box => storedSquares[Number(box.id)]).filter(Boolean);
    const boxesMatch = verifiedBoxes.length === boxes.length && verifiedBoxes.every(square =>
      square.assigned === true && square.participantId === participantId
    );
    if (!storedParticipant || !boxesMatch) {
      return json({ error: "Reservation could not be verified" }, 409, origin);
    }

    const dedupeKey = `reservation:${ownerUid}:${poolId}:${participantId}:${boxes.map(box => Number(box.id)).sort((a, b) => a - b).join("-")}`;
    if (await env.NOTIFICATION_DEDUP.get(dedupeKey)) {
      return json({ sent: true, duplicate: true }, 200, origin);
    }

    const poolName = clean(pool.name || payload.poolName);
    const boxLabels = boxes.map(box => `#${Number(box.id) + 1}`).join(", ");
    const reservedAt = new Date(Number(payload.reservedAt)).toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const text = [
      "New box reservation",
      "",
      `Pool: ${poolName}`,
      `Boxes: ${boxLabels}`,
      `Name: ${clean(storedParticipant.name) || "Not provided"}`,
      `Alias: ${clean(storedParticipant.alias) || "Not provided"}`,
      `Email: ${clean(storedParticipant.email) || "Not provided"}`,
      `Phone: ${clean(storedParticipant.phone) || "Not provided"}`,
      `Reserved: ${reservedAt} ET`,
    ].join("\n");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [configuredRecipient],
        reply_to: emailPattern.test(clean(storedParticipant.email, 254)) ? clean(storedParticipant.email, 254) : undefined,
        subject: `${boxes.length} box${boxes.length === 1 ? "" : "es"} reserved — ${poolName}`,
        text,
      }),
    });

    if (!resendResponse.ok) {
      console.error(JSON.stringify({ event: "resend_rejected", status: resendResponse.status }));
      return json({ error: "Email delivery failed" }, 502, origin);
    }

    await env.NOTIFICATION_DEDUP.put(dedupeKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ sent: true }, 200, origin);
  },
};
