# TA role — multiple personal TAs

Request: a T.A. role that can use the instructor view (everything on it) and enter help rooms. Several TAs per session.

## Plan

- **Identity.** A TA is a `participants` row with `isTa: true`; `alias` is the name the instructor gave them and `tokenHash` is the sha256 of their personal secret. `roomMembers.role` gains `"ta"`.
- **Credentials.** `getStaffSession(ctx, sessionId, secret)` resolves the instructor secret (`role: "instructor"`) or a TA secret (`role: "ta"`). `getInstructorSession` delegates to it, so every instructor-view query/mutation accepts a TA secret. `requireParticipant` rejects TA rows, so TAs can't rate, ask questions, opt in as helpers or join rooms as students.
- **Management (`convex/tas.ts`, instructor secret only).** `invite({ name, taSecret })` (name 1–40 chars, secret must be unused), `list` (id, name, createdAt; `null` for non-instructors), `revoke({ taId })` (deletes the TA's room seats, clears `tokenHash` and sets `revokedAt` — the row stays so their chat messages keep their name; other TAs unaffected).
- **Link.** The dashboard's *TAs* card creates a secret in the browser and shows `/ta/<sessionId>#<secret>` once with a copy button. `/ta/[sessionId]` stores the fragment secret under `dorsal:ta:<sessionId>` and redirects to `/instructor/<sessionId>`, which uses the TA secret if present (so a TA link opened in the instructor's browser really acts as that TA and a revoked TA is locked out; a *Use instructor access on this device* button drops the TA secret), else the instructor secret. Creating a session clears any TA secret for it. The header shows *Instructor* or *TA · <name>* (`getInstructorView.taName`); only the instructor sees the *TAs* card.
- **Rooms.** `rooms.joinAsTa({ roomId, instructorSecret })` (TA secret, open room, idempotent; no capacity check). Room capacity counts students only: `rooms.join` and `memberCount` ignore `"ta"` members, and the UI shows `n / capacity students`. TAs see *Enter room* in *Help rooms (live)*, which opens `/room/<id>?ta=<sessionId>`. In the room a TA has a "TA" badge, can chat, leave and close the room, has no rating card, and the back link goes to the dashboard. Room summaries include `taCount`.
- **Counts.** `getInstructorView` excludes TAs from `participants`/`participantCount`; student aliases (`Student N`) ignore TA rows.
- **Tests.** `convex/tas.test.ts`: two TAs get the instructor view and its mutations; instructor-only management; validation; several TAs in one room chat and close it; TAs rejected from student mutations; revoking one TA cuts off only that TA.

## Decisions

- The instructor still can't enter rooms (TA-only, as requested).
- Personal links are shown once; a lost link is replaced by revoking and inviting again.
