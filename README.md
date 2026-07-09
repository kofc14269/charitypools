# KoFC Charity Pools

A full-featured charity fundraising platform built for Knights of Columbus Council 14269. Run squares contests, survivor pools, and 13-run boards — all powered by Firebase.

**Live at:** [charitypools.kofc14269.com](https://charitypools.kofc14269.com)

---

## Features

- **Squares Pools** — Classic 10×10 grid with randomizable axes and score-based winner detection
- **Survivor Pools** — Weekly NFL survivor contest management
- **13-Run Boards** — MLB team-based payout boards
- **Multi-Contest** — Admins can create and manage multiple contests simultaneously
- **Per-Contest Public Links** — Share a direct `?u=...&p=...` link for each individual contest
- **Payment Tracking** — Log payments per participant with full transaction history
- **Payout Calculator** — Flexible standard, charity-split, and single-winner payout modes
- **Export / Import** — JSON backup and restore for any contest
- **Live Sports Scores** — Auto-polling NFL and MLB scores via public API
- **Google Auth** — Secure admin sign-in via Firebase Authentication (Google or email/password)
- **Responsive Design** — Works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Build | Vite 6 |
| Backend / DB | Firebase Realtime Database |
| Auth | Firebase Authentication |
| Hosting | Firebase Hosting / GitHub Pages |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Realtime Database and Authentication enabled

### Local Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

### Deploy

The site is deployed to Firebase Hosting. To deploy manually:

```bash
firebase deploy
```

Or to GitHub Pages:

```bash
npm run deploy
```

---

## Admin Access

Navigate to your hosted URL, then click the **lock icon** in the footer to reveal the Admin sign-in panel. Sign in with Google or email/password. Admin features include:

- Create / switch / delete contests
- Lock the board and generate random numbers
- Manage participants and payments
- Enter scores and view winners
- Customize charity name, payout rules, and payment info

---

## Security

- Firebase Realtime Database rules enforce that only the authenticated owner can write to their data (`users/$uid`)
- Admin password is never stored in the build bundle
- All API keys and secrets are kept in `.env.local` (gitignored) or in Firebase

---

## License

Private — KoFC Council 14269. All rights reserved.
