# FF BATTLE ZONE — Security Specification (Phase 0)

## 1. Data Invariants
1. **No Cross-User Wallet Modification**: A user (`request.auth.uid`) may read or update only their own `users/{uid}` document. Wallet balance must always remain `>= 0` (`No Negative Balance`).
2. **One Mobile = One Account**: Each phone number maps to exactly one immutable document in `phone_registry/{phoneId}`. Once claimed, it cannot be overwritten or deleted by any non-admin user.
3. **No Duplicate Slot or Duplicate Join**:
   - Join document IDs are deterministically `${tournamentId}_${uid}` and may only be created if non-existent.
   - Slot lock documents at `tournaments/{tournamentId}/slots/{slotNumber}` cannot be overwritten once taken.
   - Tournament `slotsFilled` must equal `existing().slotsFilled + 1` and never exceed `slotsTotal`.
4. **10-Minute Room ID Lock**: `tournaments/{tournamentId}/private/room` is readable ONLY by admins or joined users when `request.time.toMillis() >= tournament.matchTimestampMs - 600000`.
5. **Immutable Transaction Ledger & Admin-Only Payouts/Approvals**: Users cannot modify or delete `transactions`, cannot approve their own `withdrawals`, and cannot publish `results` or create `tournaments`.
6. **PII Isolation**: User `email` and `phone` live in `users/{uid}` (owner or admin read only). Public rankings use `leaderboard/{uid}` with zero PII.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated User Read**: Unauthenticated client attempts `getDoc(doc(db, 'users', 'u1'))`.
2. **Cross-User Wallet Tampering**: User `u1` attempts `updateDoc(doc(db, 'users', 'u2'), { walletBalance: 99999 })`.
3. **Negative Wallet Balance**: User `u1` attempts `updateDoc(doc(db, 'users', 'u1'), { walletBalance: -50 })`.
4. **Self-Privilege Escalation (Ghost Field)**: User `u1` creates `users/u1` with `{ role: 'admin', isAdmin: true }`.
5. **Self-Admin Registry Write**: User `u1` attempts `setDoc(doc(db, 'admins', 'u1'), { uid: 'u1', email: 'hack@test.com' })`.
6. **Early Room ID Peek**: Joined user `u1` attempts to read `tournaments/t1/private/room` 30 minutes before `matchTimestampMs`.
7. **Unjoined Room ID Peek**: Non-joined user `u2` attempts to read `tournaments/t1/private/room` within 5 minutes of match start.
8. **Duplicate Slot Steal**: User `u2` attempts `setDoc(doc(db, 'tournaments/t1/slots/7'), { userId: 'u2', slotNumber: 7 })` when slot 7 already exists.
9. **Mobile Account Duplication**: User `u2` attempts to overwrite `phone_registry/919876543210` with `{ uid: 'u2' }`.
10. **Self-Approved Withdrawal**: User `u1` creates or updates `withdrawals/w1` with `{ status: 'approved' }`.
11. **Fake Result Publish**: Non-admin user `u1` attempts `setDoc(doc(db, 'results/t1'), { winnerUserId: 'u1' })`.
12. **Oversized ID Poisoning**: User `u1` attempts write to `joins/` with a 500-character document ID containing invalid characters.
