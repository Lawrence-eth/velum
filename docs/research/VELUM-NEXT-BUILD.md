# Velum: the next build

## Recommendation

Build a confidential work-order payment flow for software contractors and coding agents. The proposed product promise is: **release payment only when the exact agreed work has been accepted, the private commercial rules permit it, and the work order has not already been paid.** GitHub is the first evidence connector, not the entire product identity.

This is a more defensible direction than adding another wallet limit, chatbot, chain, or invoice dashboard. It combines independent evidence, private commercial authorization and persistent settlement into one task. It is an engineering recommendation, not a claim of market uniqueness or a forecast of winning. Paying for merged pull requests and agent escrow already have public precedents.

The smallest compelling demonstration is a payment request carrying a real successful GitHub run for the wrong revision. Velum holds it despite the correct wallet and amount. The operator supplies the accepted revision; CRE independently retrieves its evidence, checks the private work order, and produces an authorization for that exact payment. Settlement consumes it once. Reloading and requesting payment again shows the same history and rejects the duplicate.

The existing payment console, actual CRE CLI executor, Solidity treasury, batch policy and persistent accounting primitives provide a substantial foundation. The work-order connector and integrated lifecycle are **proposed**, not present in the deployed application. A separate read-only feasibility probe validates access to real GitHub evidence without claiming CRE execution or payment.

## Evaluation context

ETHGlobal evaluates technicality, originality, practicality, usability and overall impression. These criteria favor a coherent, demonstrable problem solved well. Chainlink's confidential-workflow prize specifically requires meaningful confidential logic integrated into core functionality, and accepts successful CLI simulation or live deployment evidence. Meeting qualification requirements is necessary but does not establish comparative merit.[^1][^2]

For Velum, the practical implication is to concentrate on the decision that genuinely requires private external context. Recipient and amount checks are useful enforcement, but a generic allowlist can explain much of the current wrong-wallet demonstration. Verifying whether a particular contracted deliverable is entitled to payment under private terms presents a richer reason for authenticated offchain retrieval and confidential evaluation.

The submission should retain precise execution labels. Current runs use actual CRE CLI simulation and server-local Solidity, with synthetic commercial records and mock forwarder identity. Hardware attestation and production oracle authentication are not demonstrated. A stronger use case does not change those facts.

## Competitive landscape

The following comparisons concern documented capabilities, not independently audited vendor implementations. Absence from a reviewed page is not proof that a competitor lacks a feature.

| Product or protocol | Documented capability | Implication for Velum |
|---|---|---|
| Coinbase CDP | Spend permissions constrain token, amount and period; the policy engine evaluates transaction parameters such as destination, value and network | Agent spending limits are an established infrastructure feature, not a distinctive proposition by themselves.[^3][^4] |
| Privy | Key-level transfer limits, recipient/contract/network restrictions, time constraints and transaction parameter rules | Adding a policy editor alone would enter a crowded category.[^5] |
| Safe | Modules support automated execution and spending restrictions; agent quickstarts include human approval and spending limits | Safe integration could aid adoption later, but would not supply the missing business decision.[^6][^7] |
| Request Finance | Invoice approval/rejection and accounts-payable workflows, including approval routing and batch payment | Generic invoice capture, approval and payout are already mature product territory.[^8][^9] |
| Chainlink audit-firewall template | Confidential pre-execution checks using external contract artifacts and AI analysis | Calling Velum an AI firewall without a specific commercial workflow risks looking close to an existing template.[^10] |
| AP2 | Its current specification describes checkout and payment mandates with constraints used to check alignment with user intent | A generic signed mandate is not sufficient differentiation; source evidence and lifecycle enforcement must do real work.[^11] |
| x402 | HTTP-native payment requirements, verification and settlement for API/resource access | A payment transport integration is useful when the actual product sells API access; it does not itself establish that a software milestone deserves payment.[^12] |
| ERC-8004 | Identity, reputation and validation registries; the specification itself notes limits on guarantees about advertised capability | An agent identity badge would add little before the underlying work and payment decision is reliable.[^13] |
| Clawback | Its ETHGlobal showcase describes agent escrow and confidential AI dispute adjudication | Agent escrow and private evidence adjudication already have hackathon precedents. The showcase is a team description, not an independent verification of all claims.[^14] |
| zkPull | Its repository describes automated GitHub bounty settlement using merge verification | “Pay on PR merge” cannot be presented as a new invention. Velum needs the additional private contract, revision and shared-state problem.[^15] |

The resulting positioning is deliberately narrow: **commercial authorization for a specific accepted deliverable, with confidential terms and durable prevention of duplicate payment**. It can complement wallet policies rather than attempting to replace every wallet capability. Whether customers value this combination enough to adopt it remains unvalidated.

## Current implementation audit

This assessment inspected the repository at `f80c506`, including `src/agent.ts`, `src/accounting-object.ts`, `src/ledger.ts`, `src/batch.ts`, `workflow/batch-main.ts`, `scripts/cre-job-executor.ts` and `contracts/BatchTreasury.sol`.

The main flow executes real inference, queues an authenticated CRE job, retrieves a synthetic accounting bundle inside the confidential handler, obtains an ABI report, delivers its exact bytes to compiled Solidity and checks settlement results. It already distinguishes model responses from explicitly injected proposals and operator corrections. This is useful technical substance worth preserving.

Four weaknesses constrain the product story. First, the model can propose only one fixed invoice identity. Second, every execution creates a new treasury, so the main page cannot demonstrate durable financial state across payments. Third, the accounting workspace has persistence and reservations but is separate from the main execution path. Fourth, the independent source is synthetic; no work-system evidence determines the primary outcome.

There are also integration hazards that a superficial “connect the pages” change would miss:

- The accounting import path treats operator-imported invoice values as canonical source values. Passing an untrusted model proposal into that path would collapse the authority boundary. Work-order terms must come from a distinct authorized source.
- Treasury replay protection currently uses request and batch identities. New requests in fresh treasuries do not establish that the same underlying work can only be paid once.
- A job timeout is harmless in the current isolated simulation. In a real settlement flow, a timeout can mean the transaction succeeded but the response was lost. Releasing its reservation automatically could allow a second payment.
- Refreshing a response timestamp does not prove its underlying evidence was freshly observed. Provider observation time, source revision and authorization expiry must have distinct meanings.
- Source commitments and report authentication answer different questions. A hash binds bytes; it does not prove the source was truthful or the executor was attested.

These are reasons to design a bounded lifecycle rather than attach more UI states to the existing isolated runs.

## Proposed feature: private work orders

A work order records the payer-approved commercial terms and the conditions under which a specific milestone is payable. Its authoritative fields include an opaque work-order identity, vendor identity, verified recipient, token, exact amount, private purchase-order budget, accepted repository identity, accepted revision, allowed workflow identity, evidence requirements, policy revision and validity window.

The agent submits a payment proposal and an evidence reference. It cannot change the commercial terms, choose arbitrary evidence endpoints, register its own approved workflow or mark work accepted. A payer or authorized maintainer establishes the acceptance record independently. The first prototype should use a configured work order and clearly label its terms synthetic, while retrieving the work-system evidence live.

CRE should retrieve two independent inputs: the authorized work order and the provider evidence. It checks their agreement, checks the reserved budget and unpaid state, and returns a decision bound to the exact payment and reservation. GitHub evidence is a first connector because the environment already has read access and the existing repository contains observable successful workflow runs. That reduces setup uncertainty without pretending the repository is a customer project.

A successful CI run proves only that a particular workflow completed successfully according to GitHub. It does not prove business acceptance, good software or honest tests. The policy must pin repository and workflow identities, require the accepted commit, establish who may accept work, and prevent a supplier from replacing the trusted test policy with a trivial passing workflow. GitHub's security guidance reinforces the need to treat workflow execution and untrusted contributions carefully.[^16][^17]

A merged-PR acceptance path can be added when its trust rules are explicit: approved base repository and branch, accepted commit relationship, trusted maintainer approval, current review status and a defined merge strategy. The first version should avoid loosely inferring acceptance from an arbitrary PR URL or green badge.

## A demonstration that exposes a real distinction

Use one software work order with an agreed $2,400 payment. The console presents three readable sections: agreed terms, delivered work and payment outcome. Detailed policies, logs and commitments remain available through disclosures. The operator should not need to visit the Accounting or Controls pages to understand the task.

Start with a subtle failure: correct recipient, correct amount, authentic GitHub URL and a genuinely successful workflow, but for an earlier revision. This passes a simplistic wallet check. The evidence-bound policy denies it because the agreed deliverable is different. Label the evidence substitution explicitly; do not claim the live model invented the attack unless its actual output establishes that.

Next, choose the accepted revision from the authoritative record. Run CRE again and show the exact matching workflow and decision. Settle in a persistent, explicitly labeled test environment, record the consumed work-order authorization, and show the balance change. Refresh the browser and request payment again; the history persists and the duplicate is blocked. This makes the successful resolution as important as the rejection.

An optional final action changes the payment wallet after authorization. Solidity must reject the modified commitment. This connects business context, CRE's decision and contract enforcement without adding another product page.

## Supporting feature: shared private budgets

Bring the existing batch-budget behavior into the same work-order lifecycle after one work order works end to end. Configure two legitimate $2,400 milestones against a private $4,000 budget. Both satisfy individual caps, recipients and delivery conditions. Their combined obligation exceeds the budget.

Run competing reservations from two sessions. One may reserve $2,400; the other must remain held because only $1,600 remains. Selection should have a documented policy such as reservation order, not a claim of optimal allocation or fairness. Failed or expired authorizations need safe recovery before funds become available again.

The operator may see the private budget. The agent and public authorization should receive only what their roles require. Hiding a value in CSS or omitting it from an onchain report is not the same as hiding it from an API response. Field-level access and actual payload inspection are required before making privacy claims.

This feature supports the flagship concept rather than becoming a second demonstration. It explains why a private external ledger can matter even when each wallet-level transaction looks acceptable.

## Authorization and state model

Use a state machine with explicit identities and transitions:

| State | Meaning | Allowed next action |
|---|---|---|
| Draft | Proposal exists; funds are not reserved | Validate authoritative terms and obtain evidence |
| Held | One or more conditions fail | Correct the proposal or obtain new authoritative acceptance |
| Reserved | The work identity and budget are exclusively allocated | Queue CRE for that immutable reservation |
| Authorized | A valid report binds this payment and reservation | Submit the exact settlement |
| Submitted | Transaction or durable test execution has been initiated | Reconcile its known identity; do not release on a timeout alone |
| Paid | Confirmed settlement consumed the authorization | Read history; reject duplicate work claims |
| Cancelled/expired | Authorization is unusable and no settlement can still execute | Safely release the reservation under defined rules |

The implementation needs an idempotency key for retries, a canonical work/milestone identity for duplicate protection, and a request identifier for each execution attempt. These identifiers solve different problems. They should not be interchangeable random UUIDs.

For a persistent local-EVM demonstration, persist the execution state and journal or explicitly constrain the evidence to one durable test session. Do not write a browser-supplied “paid” flag into accounting. For a network path, mark paid only after checking the correct chain, contract, successful receipt, event, recipient, token and amount. Existing Sepolia receipts cannot be reused as evidence that this new work order settled.

There is no atomic transaction spanning GitHub, a private ledger, CRE and an EVM. The design needs reservations, idempotency and reconciliation. If report delivery or settlement is uncertain, maintain an explicit pending state and investigate it rather than declaring failure and issuing another authorization.

## Report and privacy boundaries

Extend authorization to bind an opaque work-order commitment, evidence commitment, reservation identity and policy revision as needed, in addition to the exact payment domain and expiry. The receiving contract must enforce the new fields where they affect spend rights; merely displaying them in JSON does not create an enforceable guarantee. This would require a deliberate versioned report/schema change and regenerated contract artifacts.

Keep raw private agreement text, repository credentials, commercial rates, budget and rejection details out of the public report. Public settlement still exposes token, amount and recipient. A commitment to predictable low-entropy data can be guessed; private work identifiers should use appropriate keyed or salted domain-separated commitments, with stable identity semantics for duplicate protection.

An authenticated API response is trusted source evidence, not independent proof that the provider or account owner is honest. The GitHub connector trusts GitHub and the configured acceptance authority. The accounting connector trusts its authorized record owner. The CRE CLI simulator additionally trusts the host. These assumptions should be visible in technical documentation and explained accurately during judging.

## Required evidence before calling the feature complete

| Case | Required outcome |
|---|---|
| Correct accepted revision and terms | Actual CRE report authorizes exact payment; settlement recorded |
| Successful run for another revision | Hold despite valid wallet and amount |
| Run from another repository or workflow | Hold; names alone cannot establish identity |
| Pending, failed or incomplete required checks | No authorization |
| Supplier changes trusted test definition | Hold or require separate payer approval |
| Changed recipient or one-cent amount change | Deny or contract commitment rejection |
| Agent includes its own approval/budget fields | Strict input rejection; trusted terms remain unchanged |
| Second claim for the same work under a new request ID | Deny based on canonical identity |
| Two sessions compete for insufficient shared budget | At most one reservation succeeds |
| Retry after response loss | Return or reconcile the existing operation |
| Runner unavailable or stale evidence | Hold without manufacturing a successful result |
| Settlement transfer fails | Authorization/state recovery follows a tested rollback path |
| Browser reload after payment | Same paid history and duplicate protection |
| Public receipt and log inspection | No credentials or private commercial fields leaked |

Model robustness and policy enforcement should be reported separately. A model can resist an instruction while the policy boundary remains valuable. Conversely, a deterministic injected test is useful but is not evidence of a model attack success rate. Record the number of trials, inputs, model version, malformed responses, actual proposals and enforcement outcomes before reporting any rate.

## Feasibility verified in the current environment

The read-only probe in `scripts/milestone-feasibility.mjs` retrieves two actual GitHub workflow runs for the existing public repository. Its configured acceptance predicate pins repository ID `1366413547`, workflow ID `355961046`, branch `main`, event `push` and commit `f80c506fbd178750b58c4791d751bdde47545824`.

Run `34734168531` matches those conditions and is successful. Run `34733699456` is also successful but belongs to an earlier revision, so it is rejected. Six explicitly mutated fixtures cover repository, workflow, conclusion, completion status, branch and event mismatches. The output in `evidence/milestone-feasibility.json` preserves the distinction between live records and mutations.[^18]

This establishes API access and a useful failure case. It does not establish trusted workflow content, maintainer acceptance, confidential execution, commercial validity or settlement. The current repository is public and team-controlled. No customer validation or private-repository integration is implied.

## Build sequence and stopping rules

First implement the authoritative work-order schema and read-only GitHub connector, with a configured host and bounded API operations. Expose a human-readable explanation of the mismatch. Stop if provider access or acceptance semantics cannot be made reliable; an uploaded JSON snapshot may be a labeled test fixture, never a silent replacement for live evidence.

Second, run that connector inside the actual confidential handler. Fetch credentials there, enforce the policy there, and return a bound report. Require a successful real CLI run for both accepted and stale evidence before claiming integration. Keep the existing live flow available until the new path passes.

Third, connect one persistent reservation and settlement lifecycle. Reuse the existing ledger's transaction and idempotency patterns, but preserve independent canonical terms. Add the new execution binding rather than marking a simulation as a Sepolia payment. Require duplicate-after-reload and uncertain-settlement tests before exposing automatic retries.

Fourth, integrate the shared-budget case and the public/private receipt view. These are supporting explanations of the same work order. Finish by capturing one concise narrated demonstration and updating the submission to the final behavior.

Each stage should leave a truthful, usable artifact. Do not spend the remaining event time on an incomplete accounting-provider OAuth system, general-purpose escrow disputes, token economics or a multi-chain rollout. No fixed hour estimate is asserted: the acceptance and settlement boundaries are the main implementation uncertainty.

## Candidate priorities

| Candidate | Competitive contribution | Delivery risk | Decision |
|---|---|---|---|
| Private work order + exact work evidence | Stronger commercial reason for external confidential evaluation | Medium–high | Flagship recommendation |
| Persistent payment/reservation lifecycle | Major completeness gain; limited novelty alone | Medium–high | Required foundation for flagship |
| Shared private budget race | Clear security consequence using existing policy work | Medium | Add inside flagship |
| Broader adversarial evaluation | Improves evidence quality and limits exaggerated claims | Low–medium | Include a bounded suite |
| Public/private receipt view | Explains confidentiality and report binding | Low–medium | Supporting interaction |
| Safe integration | Useful compatibility but established functionality | Medium–high | Defer unless target users require it |
| x402, AP2 or ERC-8004 integration | Useful only with a concrete interoperability need | Medium–high | Defer decorative integration |
| General AI dispute tribunal | Overlapping precedent and subjective verification problem | High | Do not pivot to it now |
| Additional chains, token or DAO | Little contribution to the present decision | High distraction | Defer |
| Another homepage redesign | Readability is improved; does not close business gaps | Low technical risk, high opportunity cost | Make only task-driven refinements |

These rankings are analytical judgments based on the implementation and reviewed sources. They are not market shares, measured user preferences or winning probabilities.

## Human evidence and submission credibility

The most useful external validation would be one software-team operator walking through a recent contractor payment: what establishes acceptance, who may change the wallet, what remains private, and what happens if payment status is uncertain. That would test the premise behind the work-order model. No such interview has been completed, and no quotations or customer traction should be invented.

Meaningful human contribution and human narration also matter under the event guidance. The team should document actual decisions and testing, explain the trust model in its own words, and narrate the final demonstrated flow. The current implementation disclosure should remain accurate. More generated features cannot substitute for these parts of the submission.[^1]

The defensible pitch is a concrete task: **a coding agent can request compensation, but only independently accepted work under the payer's private terms can unlock a single payment.** The demo must earn each part of that sentence.

## Sources

All web sources were accessed September 13, 2026. Documentation is current to the retrieved page; product and showcase descriptions are publisher claims unless otherwise stated.

[^1]: ETHGlobal. [ETHOnline 2026 details: judging, AI guidance and demo requirements](https://ethglobal.com/events/ethonline2026/info/details). Undated event page.
[^2]: ETHGlobal / Chainlink. [ETHOnline 2026 Chainlink prizes](https://ethglobal.com/events/ethonline2026/prizes/chainlink). Undated event page.
[^3]: Coinbase. [Spend Permissions](https://docs.cdp.coinbase.com/wallets/using-wallets/spend-permissions). Undated documentation.
[^4]: Coinbase. [Policy Engine](https://docs.cdp.coinbase.com/wallets/security-and-policies/policy-engine/overview). Undated documentation.
[^5]: Privy. [Policies overview](https://docs.privy.io/controls/policies/overview). Undated documentation.
[^6]: Safe. [Safe Modules](https://docs.safe.global/advanced/smart-account-modules). Undated documentation.
[^7]: Safe. [AI agent quickstarts](https://docs.safe.global/home/ai-agent-quickstarts/introduction). Undated documentation.
[^8]: Request Finance. [Invoices API](https://docs.request.finance/invoices). Undated documentation.
[^9]: Request Finance. [Accounts Payable](https://www.requestfinance.com/products/accounts-payable). Undated product page.
[^10]: Chainlink Labs. [AI Smart Contract Audit Firewall](https://docs.chain.link/cre-templates/ai-audit-firewall). Undated template documentation.
[^11]: AP2. [Agent Payments Protocol specification](https://ap2-protocol.org/ap2/specification/). Current retrieved specification; terminology should be rechecked at implementation.
[^12]: x402. [Introduction](https://docs.x402.org/introduction). Undated documentation.
[^13]: Marco De Rossi et al. [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004). Created August 2025; retrieved page identifies a draft specification.
[^14]: Clawback team. [Clawback ETHGlobal showcase](https://ethglobal.com/showcase/clawback-vpmw2). ETHGlobal New York 2026. Self-reported architecture; not used as independent performance or security evidence.
[^15]: zkPull contributors. [zkPull contracts repository](https://github.com/zkPull/zkpull-contracts). Undated README; project claims used only to establish prior art.
[^16]: GitHub. [REST API endpoints for workflow runs](https://docs.github.com/en/rest/actions/workflow-runs). Undated documentation.
[^17]: GitHub. [Secure use reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use). Undated documentation.
[^18]: GitHub / Velum. [Matching workflow run](https://github.com/Lawrence-eth/velum/actions/runs/34734168531) and [earlier workflow run](https://github.com/Lawrence-eth/velum/actions/runs/34733699456). Live metadata retrieved September 13, 2026; normalized probe output in `evidence/milestone-feasibility.json`.
