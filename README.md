# Touchline

A mobile-first recreational soccer league manager built with Vite, React, and Tailwind CSS.

## Quick Start

```bash
cd "C:\Users\mokhi\Desktop\AI projects\Touchline"
npm install
npm run dev
```

Vite prints a URL like `http://127.0.0.1:5173/` and should open your browser automatically.

**Keep the terminal open** while developing — closing it stops the server.

### Troubleshooting

1. Run `npm install` first (especially after new packages like `lucide-react`).
2. Use the **exact URL** from the terminal. If 5173 is busy, Vite uses 5174, 5175, etc.
3. Stop stale servers with `Ctrl+C` in any terminal still running Vite, then run `npm run dev` again.
4. Fallback without dev server:
   ```bash
   npm run build
   npm run preview
   ```

## Features

- **Role switcher** — Toggle between Organizer, Captain, and Player in the header
- **Dashboard** — Next match card with kit colors, RSVP buttons, and postpone workflow
- **Team** — Roster grouped by RSVP status, team chat, captain roster tools
- **Schedule** — League standings and match results history

All data lives in `src/mockData.js` and is managed in memory via React Context.
