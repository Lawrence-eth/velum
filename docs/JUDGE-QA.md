# Judge Q&A

**Why Chainlink rather than a normal API server?**
The intended deployment executes sensitive policy evaluation in CRE's confidential
handler and releases only the report needed by the treasury. A conventional server
can enforce the same business rules but does not itself provide the proposed enclave
execution boundary and DON delivery path. Our simulator and mock-forwarder demo do
not establish those production trust properties.

**What is private?**
Invoice references, vendor identifiers, PO terms, private thresholds, and detailed
reasons are omitted from the report. The accounting operator sees them. Amounts,
recipients, token addresses, decisions, and commitments are exposed onchain. Repeated
outputs may leak patterns. This is not anonymous payment infrastructure.

**Why isn't this just invoice software?**
The distinctive integration is a confidential batch policy decision bound to an
ordered set of exact onchain payments, with replay checks, shared-budget handling,
and persistent invoice accounting. We have not established that commercial invoice
products lack all these features; the claim is about our implementation, not market uniqueness.

**Can I use it with my business today?**
It is a synthetic prototype. CSV editing, isolated persistent reservations, and
finalized Sepolia reconciliation work. It is not connected to a live accounting
provider, arbitrary live treasury, or deployed confidential workflow.

**Does the browser pay invoices?**
No. It reserves synthetic accounting entries. The recorded CRE CLI broadcast made
the actual Sepolia transfers. Reconciliation reads those receipts without signing.

**What prevents double spending across runs?**
One durable object per workspace serializes storage changes. Canonical vendor/invoice
identities block repeated invoices. Reservations and paid records reduce available
budget. Independent workspace keys represent separate demo ledgers; production
must bind authenticated organizations to a canonical accounting source.

**Can an owner change the outcome?**
The prototype trusts the treasury owner and accounting source. A dishonest source
can supply false policies. In the simulation adapter the owner additionally pins
the exact report hash. This is not protection against a malicious treasury owner.

**What about reorgs and cancellation?**
Reconciliation requires a canonical receipt at or below the RPC's finalized block.
It trusts that configured RPC and the deployed test-token contract. Preview-only
reservations can be released; chain-bound records cannot be released in this UI.
A general production cancellation flow must verify onchain revocation before
releasing budget, and is not implemented here.

**What did you personally contribute?**
Answer only from actual work and the review/customer records. Codex generated most
implementation and drafts. Lawrence supplied project direction and environment,
reviewed iterations, chose the brand, authenticated services, and funded testnet
execution. Additional human research, acceptance review, and narration remain
unclaimed until completed. ETHGlobal decides eligibility.
