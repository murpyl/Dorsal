# ClassPulse

Live classroom confusion radar + peer help + concept graph. Product spec: `docs/MVP_Outline.md`. Build plan: `docs/Build_Instructions.md`.

## Run locally

```bash
npm install
npx convex dev      # needs `npx convex login` or CONVEX_DEPLOY_KEY (dev key); writes .env.local
npm run dev         # second terminal
```

Env vars: `NEXT_PUBLIC_CONVEX_URL` (written by `convex dev`). `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` are Convex deployment env vars (Phase 3).
