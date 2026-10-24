Refer to `docs/MVP_Outline.md` (product) and `docs/Build_Instructions.md` (implementation) for the full build outline.

Plan first before you code. Use higher reasoning for planning than for coding. Instruct subagents to implement plans based on priorities.
Your job is to UNDERSTAND the plan first before you write code.
Implement one feature at a time.
Do not implement future-ticket features.
For every feature, git commit the plan and code.
Do not refactor unrelated systems.
Do not introduce new architecture unless required.
Avoid unnecessary dependencies.
Run build/tests when possible.
Report files changed, commands run, build results, and manual verification steps.
Respond with as little preamble as possible; keep explanations concise and not overly complex.
When coding, do not preserve backward compatibility, choose the simplest implementation that fully meets all the current requirements,  and prefer well established libraries over custom implementations
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
