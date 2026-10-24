# Phase 4: PeerMesh (session B)

Scope: `docs/Build_Instructions.md` §5 Phase 4, as fixed by `docs/plans/phase-3-4-contract.md` ("Phase 4 (B)" rows). No cluster UI — rooms take an optional `clusterId`, but "open a room from a published cluster" is wired in the integration pass. No AI call, no stretch features.

## Plan (one commit per feature)

1. **Helper opt-in** — `participants.setHelper` (replaces `helperConceptIds`; every concept must belong to the session), `participants.me`. `HelperOptIn` renders one checkbox per concept with copy that says the role is self-declared and opt-in, nobody is enrolled or contacted automatically. Mounted after the concept list in `StudentCockpit`.
2. **Rooms** — `convex/rooms.ts`:
   - `createForCluster` (instructor; cluster, if given, must be published and in the session; capacity default 6, 2–12; title defaults to the concept label) and `createAsHelper` (participant must have opted into the concept; joins as `helper`).
   - `join` re-reads the member count and the `by_room_participant` index inside the mutation, so capacity and no-duplicate-membership hold transactionally (Convex mutations are serializable). Joining as `helper` requires having opted into the room's concept. Closed rooms/sessions reject.
   - `leave`, `close` (instructor secret **or** a token whose membership in the room is `helper` — the schema has no `createdBy`, so "the helper who created it" is approximated by "a helper member"; documented compromise).
   - `listBySession` (student: `isMember`, `myRole`, counts, no identities) and `listInstructor` (live `memberCount`/`helperCount`).
   - `get` returns `null` unless the caller is a member: room, concept, session `phase`/`state`, members `{ alias, role, isSimulated }`.
   - `RoomList` (student): helper's "Open a help room" concept dropdown + join/open buttons. `RoomStatus` (instructor, exported from `RoomList.tsx`): concept dropdown + "Open help room", live member counts, Close.
3. **Chat + room page** — `convex/messages.ts`: `send` (member only, 1–500 chars, ≤ 10 messages per participant per 10 s) and `listByRoom` (member only, last 200, `authorAlias`, `isMine`). `/room/[roomId]` page + `PeerRoom`: topic/description, live member list (simulated label), chat, `I understand now` / `Still confused` → existing `signals.upsert` for the room's concept under the session's current phase (shown in the UI).
   - **Token decision:** the page reads `?code=` from the URL and the token from `localStorage[studentTokenKey(code)]`. `RoomList` always links to `/room/<id>?code=<code>`. Without a code/token the page shows a "join the session first" link instead of querying.
4. **Phase + comparison** — `sessions.setPhase`, `sessions.close`; `signals.prePostByConcept` (per concept, `pre`/`post` `{ counts, total }`). `SessionControls` (exported from `PrePostComparison.tsx`) is the header control: pre ↔ post toggle and Close session. `PrePostComparison` shows pre vs post bars with N for each phase and the note that this is self-reported signal change, not verified learning gain.

## Privacy rules kept

- Students never see per-participant signals; room/member lists expose alias + role + simulated flag only.
- Messages are readable/writable by members only (checked on every query/mutation).
- Phases are stored on each signal and never merged (§8 #9).

## Acceptance

Two browser profiles join one room and chat live; a third join beyond capacity fails; a non-member gets `null`/error for messages; instructor sees the room active; after switching to post, room buttons write post signals and the comparison + graph update live.
