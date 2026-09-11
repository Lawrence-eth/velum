import { z } from 'zod';
import { encodeAbiParameters, keccak256, parseAbiParameters, type Hex } from 'viem';
import { bundleSchema, evaluate, paymentCommitment } from './policy';
import { fixture } from './fixtures';

export const batchSchema = z.object({
  batchId: z.string().regex(/^0x[0-9a-f]{64}$/),
  snapshotAt: z.number().int().nonnegative().safe(),
  policyVersion: z.string().min(1).max(100),
  entries: z.array(z.object({
    invoiceKey: z.string().min(1).max(160),
    label: z.string().min(1).max(100),
    bundle: bundleSchema,
  }).strict()).min(1).max(20),
}).strict();
export type Batch = z.infer<typeof batchSchema>;
export type BatchDecision = { requestId: Hex; commitment: Hex; approved: boolean; expiresAt: bigint };
export const batchReportAbi = parseAbiParameters('bytes32 batchId, bytes32 manifest, (bytes32 requestId, bytes32 commitment, bool approved, uint64 expiresAt)[] decisions');

export function batchManifest(batch: Batch): Hex {
  return keccak256(encodeAbiParameters(parseAbiParameters('bytes32[] commitments'), [batch.entries.map(e => paymentCommitment(e.bundle.request))]));
}

export function evaluateBatch(input: Batch, now: number) {
  const batch = batchSchema.parse(input);
  if (!Number.isSafeInteger(now) || batch.snapshotAt > now || now - batch.snapshotAt > 120) throw new Error('Stale or future accounting snapshot');
  const seenRequests = new Set<string>(), seenInvoices = new Set<string>();
  const ledgers = new Map<string, { policy: string; remaining: bigint }>();
  const details: { label: string; approved: boolean; reasons: string[]; amount: string; remaining: string; invoiceKey: string }[] = [];
  const decisions: BatchDecision[] = [];
  let approvedAmount = 0n, rejectedAmount = 0n, isolatedAmount = 0n;
  const domain = batch.entries[0].bundle.request;
  for (const entry of batch.entries) {
    const b = entry.bundle, r = b.request, p = b.policy;
    if (r.chainId !== domain.chainId || r.consumer !== domain.consumer || r.token !== domain.token) throw new Error('Mixed payment domains or tokens');
    if (seenRequests.has(r.id)) throw new Error('Duplicate request ID');
    seenRequests.add(r.id);
    const key = JSON.stringify([p.vendorId, p.purchaseOrder, p.token]);
    const fingerprint = JSON.stringify(p);
    let ledger = ledgers.get(key);
    if (!ledger) { ledger = { policy: fingerprint, remaining: BigInt(p.remainingPurchaseOrder) }; ledgers.set(key, ledger); }
    if (ledger.policy !== fingerprint) throw new Error('Inconsistent purchase-order snapshots');
    const isolated = evaluate(b, now);
    if (isolated.approved) isolatedAmount += BigInt(r.amount);
    const verdict = evaluate({ ...b, policy: { ...p, remainingPurchaseOrder: ledger.remaining.toString() } }, now);
    const invoiceIdentity = JSON.stringify([p.vendorId, entry.invoiceKey]);
    if (seenInvoices.has(invoiceIdentity)) verdict.reasons.push('Duplicate invoice in this batch');
    // Reserve the invoice identity even when rejected: a later conflicting copy must not win.
    seenInvoices.add(invoiceIdentity);
    verdict.approved = verdict.reasons.length === 0;
    if (verdict.approved) { ledger.remaining -= BigInt(r.amount); approvedAmount += BigInt(r.amount); }
    else rejectedAmount += BigInt(r.amount);
    decisions.push({ requestId: r.id, commitment: paymentCommitment(r), approved: verdict.approved, expiresAt: BigInt(r.expiresAt) });
    details.push({ label: entry.label, invoiceKey: entry.invoiceKey, amount: r.amount, approved: verdict.approved, reasons: verdict.reasons, remaining: ledger.remaining.toString() });
  }
  const manifest = batchManifest(batch);
  const encodedPayload = encodeAbiParameters(batchReportAbi, [batch.batchId as Hex, manifest, decisions]);
  return { manifest, encodedPayload, decisions, details, approvedAmount: approvedAmount.toString(), rejectedAmount: rejectedAmount.toString(), isolatedAmount: isolatedAmount.toString() };
}

export function batchFixture(now: number, budget = 6000, consumer?: string, token?: Hex): Batch {
  const rows = [
    ['Design sprint', 'NS-101', '4200000000', 'approved'],
    ['Frontend build', 'NS-102', '3800000000', 'approved'],
    ['Changed bank wallet', 'NS-103', '2400000000', 'wrong-recipient'],
    ['Resubmitted sprint', 'NS-101', '4200000000', 'approved'],
    ['Security review', 'OR-201', '1600000000', 'approved'],
  ] as const;
  const entries = rows.map(([label, invoiceKey, amount, scenario], index) => {
    const bundle = fixture(scenario, now, consumer);
    bundle.request.id = keccak256(encodeAbiParameters(parseAbiParameters('string namespace, uint256 index'), ['velum-batch-v2', BigInt(index)]));
    bundle.request.amount = bundle.invoice.amount = amount;
    if (token) bundle.request.token = bundle.policy.token = token;
    bundle.policy.remainingPurchaseOrder = (BigInt(budget) * 1000000n).toString();
    if (index === 4) {
      bundle.invoice.vendorId = bundle.policy.vendorId = 'SYNTHETIC-ORBIT-02';
      bundle.invoice.purchaseOrder = bundle.policy.purchaseOrder = 'PO-2026-088';
      bundle.policy.remainingPurchaseOrder = '3000000000';
      bundle.request.recipient = bundle.invoice.recipient = bundle.policy.recipient = '0x5555555555555555555555555555555555555555';
    }
    return { label, invoiceKey, bundle };
  });
  return { batchId: keccak256(encodeAbiParameters(parseAbiParameters('string name, uint256 timestamp'), ['velum-batch-v2', BigInt(now)])), snapshotAt: now, policyVersion: 'synthetic-policy-v2', entries };
}
