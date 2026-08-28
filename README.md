# NoteFlow ✨

**A premium, modern notes app** — rich text editing, folders, tags, encryption, attachments, drawings, realtime sync, and a polished Material 3 UI. Inspired by the best Android note apps (Samsung Notes, Google Keep, Transsion Notepad) but built as a completely original, production-ready product.

## Tech Stack

| Layer | Tooling |
| --- | --- |
| UI | React 19, Vite, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, Lucide |
| Forms / Data | React Hook Form, TanStack Query, Zustand |
| Lists | react-window + react-virtuoso (virtualized note lists) |
| Editor | contenteditable rich-text with full toolbar + interactive checklists (dnd-kit) |
| Backend | Firebase (Auth + Cloud Firestore + Storage + Realtime) |
| PWA | vite-plugin-pwa (offline-first, installable) |
| Export | jsPDF (PDF), text export, JSON backup |

## ✨ Features

- **Home dashboard** — greeting, live date, search, stats, pinned / recent / favorite, quick actions
- **Rich text editor** — bold, italic, underline, strike, highlight, headings, lists, checklist, code block, quote, divider, table, images, attachments, drawing, emoji, mentions, links, undo/redo
- **Interactive checklists** — tap to complete, drag to reorder, progress bar, word/char/reading-time stats
- **Organization** — nested folders, color-coded tags, note colors, pin/archive/favorite/lock/trash
- **Instant search** — search titles + content, advanced filters (favorites, locked, archived, date range)
- **Media** — attach images and files (Cloudinary CDN), whiteboard drawing (data URL export)
- **Security** — per-note encryption-ready hooks (Web Crypto AES-GCM)
- **Sync** — realtime Firestore snapshots, offline-first cache, optimistic UI, auto-save
- **Backup** — one-click JSON cloud backup export/restore, per-note PDF/TXT export
- **Polish** — dark/light/system theme, 9 accent colors, font sizing, glassmorphism, 60fps animations, PWA (English UI only)

## 📁 Project structure

```
src/
├── app/          # App entry, providers
├── components/
│   ├── ui/       # shadcn/ui primitives
│   ├── layout/   # sidebar, top bar, FAB, command palette
│   └── features/ # notes, editor, search feature components
├── features/     # feature colocation
├── hooks/        # TanStack Query + custom hooks
├── services/     # Firebase API layer (Auth + Firestore + Storage)
├── stores/       # Zustand stores
├── pages/        # routed pages
├── routes/       # router config
├── utils/        # helpers (date, text, crypto, export…)
├── types/        # domain types
├── constants/    # colors, options, table names
└── styles/       # design system (globals.css)
```

## 🚀 Quick start

```bash
# 1. Install
npm install

# 2. Configure Firebase (optional)
#    The public web config is baked into src/services/firebase.ts, so the app
#    runs out of the box. To point at your own project, copy .env.example → .env
#    and fill the VITE_FIREBASE_* values from the Firebase Console.
cp .env.example .env

# 3. Enable auth providers in the Firebase Console
#    Authentication → Sign-in method → enable Email/Password and Google.
#    Firestore Database → create the database and publish security rules.

# 4. Develop
npm run dev

# 5. Production build
npm run build && npm run preview
```

## 🔐 Environment variables

| Variable | Description |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (`<project>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging sender id |
| `VITE_FIREBASE_APP_ID` | Firebase app id |

All values are optional — defaults are baked into `src/services/firebase.ts`.

## 🗄️ Database

Data is stored in **Cloud Firestore** across these collections:

- `profiles`, `notes`, `folders`, `tags`, `attachments`, `versions`, `settings`, `activity_logs`, `note_shares`
- Notes carry tag membership inline as a `tag_ids: string[]` array (no join collection)
- Soft-delete is a `deleted_at` timestamp on the note document (trash view filters on it)
- **Realtime** via Firestore `onSnapshot` listeners for notes
- Secure every collection with owner-scoped **Firestore Security Rules** (`request.auth.uid == resource.data.user_id`)

### Auth providers

Firebase Auth supports **email/password**, **Google OAuth**, and **email-link (magic link)** sign-in.
To enable Google login: Firebase Console → Authentication → Sign-in method → enable **Google**. Add your dev/prod domains under **Authorized domains**.

## 📝 Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Strict TypeScript check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |

## 🔒 Security notes

- **Encrypted notes**: `utils/crypto.ts` provides AES-GCM encryption (PBKDF2-derived keys, 150k iterations) ready for per-note encryption; wire it to `is_locked` for server-side encrypted payloads.
- **Firestore Security Rules** guard every collection — the client never touches data outside its owner scope.
- **Attachments** upload directly from the browser to **Cloudinary** via an unsigned upload preset (no API secret in the client); the returned `secure_url` is stored on the note/attachment document.

## 🧭 Roadmap

- [ ] AI summaries & smart collections (Anthropic API)
- [ ] Collaborative realtime editing
- [ ] Handwriting / stylus support
- [ ] Localization (the UI is English-only today)

---

Made with 💜 by the NoteFlow team.
