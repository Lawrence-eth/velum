# Persistent accounting design

One SQLite-backed Cloudflare Durable Object represents one synthetic workspace.
The browser creates a random 256-bit bearer capability and stores it in localStorage;
the Worker routes that capability to a deterministic object. Requests without a valid
key are rejected. These are separate demo ledgers, not authenticated real companies.
No capability is included in public evidence or URLs.

The object persists a bounded state document in a single SQLite row. Reservation,
release and reconciliation reducers run inside `transactionSync`: related reads and
writes cannot interleave, and exceptions roll back the transaction. No remote call
occurs inside the synchronous transaction. Reconciliation fetches chain evidence
first, then reloads and checks the latest ledger inside the transaction.

## Lifecycle

CSV draft → policy evaluation → reserved invoice identity and budget → verified
payment event → paid identity. Both reserved and paid records reduce available PO
budget; reconciliation changes state without deducting the amount a second time.
A vendor/invoice identity is normalized before storage and survives fresh request
IDs and browser reloads. Within-batch duplicates are also rejected.

The preview path never broadcasts or authorizes a chain payment. Its reservations
may be released explicitly. The Sepolia example starts with the two known recorded
reservations. It only marks them paid after verifying a successful receipt, exact
treasury event, request ID, recipient, token, and amount. The receipt's block hash
must match the canonical block and its height must be at or below the RPC's finalized
block. Repeated reconciliation of the same payment is idempotent. An unrelated
transaction, forged token event, or mismatched amount cannot mark an invoice paid.

Chain-bound reservations cannot be released here. General production cancellation
requires proof of onchain revocation and reconciliation of any transfers that raced
with cancellation; that flow has not been implemented. No timeout silently releases
an outstanding chain authorization.

## CRE source

`GET /api/ledger/snapshot` requires the same workspace bearer capability. It returns
the most recently reserved run's input snapshot only while the ledger revision still
matches and the request expiry remains valid. A subsequent ledger mutation invalidates
it until another run is prepared. CRE evaluates this snapshot with the existing
batch confidential handler. The snapshot is for simulation; the browser does not
connect it to a signing key or live write operation.

The recorded integration test proxies this authenticated endpoint through a local
loopback server with a fresh test credential to accommodate the VM's DNS issue.
It retrieves the live source during CRE execution and verifies the resulting ABI
against the evaluated snapshot. After reconciliation, the paid invoice and remaining
budget states lead to rejection of all five resubmitted rows.

## API

GET `/api/ledger`: saved operator state.
GET `/api/ledger/snapshot`: latest valid CRE simulation input.
POST `/api/ledger/import`: validate CSV, return editable draft rows (no reservation).
POST `/api/ledger/reserve`: validate and atomically reserve approved rows.
POST `/api/ledger/release`: release only unpaid preview reservations from a run.
POST `/api/ledger/seed`: load the recorded Sepolia reservations into an empty workspace.
POST `/api/ledger/reconcile`: verify a finalized Sepolia payment and update accounting.

Input limit: 32 KB HTTP body; 16 KB CSV; 20 invoices per run; 100 runs per workspace.
Invoice references normalize Unicode width/case and accept only bounded ASCII IDs.
Decimal USD amounts are parsed to six-decimal integer units; no floating-point amount
is used in ledger arithmetic. Policies are separate from invoice imports.

## Trust and operational limits

Synthetic data only. Browser and accounting backend see source inputs outside the TEE.
Cloudflare stores workspace data; this does not establish end-to-end invoice privacy.
The canonical production identity/provider integration, real token support, signed
source attestations, lifecycle integration with a deployed DON, and operational
recovery procedures remain future work. A real service needs tenant authentication,
quotas, retention/deletion controls and monitored RPC availability.

Existing domain firewall rules blocked all POST methods. A scoped exception now
allows only the five ledger POST paths on velum.aethe.me; probe protection and other
hosts retain their existing rules. The exact expression is saved in
`docs/ledger-firewall-expression.txt`; the previous ruleset is backed up in ignored artifacts.


## Review, retry and receipts (audit upgrade)

POST reserve with `mode: "review"` is read-only and returns the current revision.
The UI requires review before reserving and invalidates review after edits. Reservation
includes `expectedRevision` and a unique `requestKey`. A stale revision fails before
writes. Repeating the same key and normalized input returns its original saved result;
using the key with different input fails. Run receipts persist minimal public decision
payloads, without invoice references, budgets or reasons. They are preview artifacts,
not signed CRE reports. Legacy runs without a receipt remain readable.
