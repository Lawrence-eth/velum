# CRE access request

On 2026-09-12, `cre account access` confirmed successful submission of a deployment
access request for Velum. The request described the confidential invoice/PO use
case, linked the public repository and demo, and noted the September 13 deadline.
Account access was still not enabled before submitting the request. Approval is
external; submission is not approval. A first attempt failed credential validation;
`cre whoami` and the subsequent request succeeded.

Confidential Workflows also require separate private-beta enrollment:
https://docs.google.com/forms/d/e/1FAIpQLSdk8mxDZAXpEX1PHgjzCoBeKxSoQysoO9sxOb-gpBrDrjOhtA/viewform

The form requires a full name, company/role, CRE organization ID, use-case statement,
and acceptance of its displayed private-beta terms. Full name and company/role are
awaiting Lawrence's input. That form has not been submitted.

## Prepared use-case answer
Velum is an ETHOnline 2026 prototype for confidential contractor-payment runs.
A CRE handlerInTee fetches authenticated invoice and purchase-order snapshots,
checks shared budgets, duplicate invoice identities, approved recipients and expiry,
and emits a minimal report binding the ordered payments. API credentials, invoice
references, private approval thresholds, remaining budgets and rejection reasons
must stay inside confidential execution. Payment recipients, token amounts and
public authorization decisions are deliberately disclosed for settlement.

## Additional context
Repository: https://github.com/Lawrence-eth/velum
Demo: https://velum.aethe.me
We have successful CRE CLI simulations, Sepolia broadcast through the mock forwarder,
verified test-token settlement, and persistent accounting reconciliation. The
simulation adapter uses an owner-pinned report hash and does not establish DON
signature verification or deployed TEE attestation. We request testnet confidential
workflow access to evaluate the actual deployment boundary. Synthetic data and test
tokens only. ETHOnline submission deadline: September 13, 2026 at 16:00 UTC.

## Once approval arrives
Check `cre whoami`. Confirm separate confidential-workflow enrollment. Use the
production Sepolia forwarder and actual registered workflow ID in a fresh treasury;
do not use the simulation adapter as the production trust boundary. Configure an
authenticated accounting source, deploy and verify the workflow, then run a bounded
test-token batch and save execution/transaction evidence before changing public claims.

[Deployment access docs](https://docs.chain.link/cre/account/deploy-access)
[Confidential access docs](https://docs.chain.link/cre/account/confidential-workflows-access)
