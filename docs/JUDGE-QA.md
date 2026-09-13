# Velum — judge questions

**Why not just improve the agent prompt?**
The supplied system prompt already treats invoices as untrusted. Our captured malicious invoice still caused the live model to choose an attacker wallet. Prompt defenses can help, but authorization must remain independent. We demonstrate one concrete failure path, not a universal defense or attack success rate.

**Where is Chainlink essential?**
The intended confidential workflow retrieves the source invoice and secret, evaluates private limits/budget, and releases an exact payment authorization. The model does not receive those policy fields; the public contract does not need them. The confidential handler is the decision step, not a logging add-on. We verified it through real CLI simulation, which does not prove deployed hardware confidentiality.

**Does clicking the homepage button run CRE?**
Yes. It runs live Workers AI inference, queues an authenticated job on the VM, runs the real CRE CLI confidential-handler simulation, and delivers its returned report to compiled Solidity in a fresh server-local EVM. The current execution log and report are downloadable. This is simulation with a mock forwarder, not deployed TEE attestation or a network transaction. Runs do not update persistent accounting.

**Is the malicious model response scripted?**
No: the evidence contains the actual live response, model ID, timestamp and proposed wallet. Repeated model calls may differ. A separate injected-proposal button is explicitly labeled and exists to test the policy boundary even if the model resists the invoice instruction.

**Is the agent a fully autonomous treasury operator?**
It is a constrained invoice-to-payment proposal assistant, without a wallet key or payment tools. This prototype demonstrates the execution gate, not a general autonomous accounting system. Expanding agent capabilities must preserve the separation of proposal and authorization.

**What is private?**
The intended handler keeps vendor IDs, invoice/PO references, caps, remaining budget and rejection reasons out of the report. The model sees the synthetic invoice, not the private cap or budget. Registration/settlement expose recipient, amount and token. The demo backend and CLI simulator are not private enclaves.

**Who guarantees the accounting record is true?**
The source is trusted and currently synthetic. A production connector must authenticate the organization, govern policy updates and exclusively reserve/reconcile its canonical records. A compromised source can authorize bad payments; Velum does not claim otherwise.

**Can an agent bypass the contract?**
The demonstrated agent has no signing key. The treasury checks its configured forwarder, workflow identity, payment commitments, expiry and replay state. Production deployment must also remove any alternative unrestricted spend route available to the agent. Our test forwarder setup does not prove DON authenticity.

**What actually happened onchain?**
The original batch integration broadcast an actual CRE CLI report on Sepolia and settled two test-token transfers totaling 5,800. It uses a public simulation forwarder and owner-pinned report adapter with artificial metadata. The new agent scenarios ran in local EVMs; they are not those Sepolia transactions.

**Why maintain the payment desk and contract lab?**
They support the two sides of the gate. The desk demonstrates durable source reservations, shared-budget safety, duplicate identity and reconciliation. The lab lets judges exercise actual contract bytecode against nine conditions. The agent preview is not yet wired into the persistent desk lifecycle.

**What would you build next?**
One authenticated accounting-provider connector, exclusive reservation and reconciliation across agent runs, governed policy updates, and deployed CRE confidential execution with registered production identity. Validate this with a treasury operator using their real workflow before claiming product-market fit.

**What did the human team contribute?**
Describe actual work only: Chainlink direction, environment/account setup, authentication, product reviews, name and visual direction, and whatever additional testing or narration the team actually completes. AI-generated implementation and drafts are disclosed. Customer interviews remain uncompleted.
