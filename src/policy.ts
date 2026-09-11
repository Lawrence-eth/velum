import { z } from 'zod';
import { encodeAbiParameters, keccak256, parseAbiParameters, type Hex } from 'viem';

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(s => s.toLowerCase() as Hex);
const id = z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform(s => s.toLowerCase() as Hex);
const units = z.string().regex(/^(0|[1-9][0-9]{0,35})$/);
export const bundleSchema = z.object({
  request: z.object({
    id, chainId: z.number().int().positive().safe(), consumer: address,
    recipient: address, token: address, amount: units,
    expiresAt: z.number().int().positive().safe(),
  }).strict(),
  invoice: z.object({
    vendorId: z.string().min(1), purchaseOrder: z.string().min(1),
    currency: z.string().length(3), recipient: address, amount: units,
    alreadyPaid: z.boolean(),
  }).strict(),
  policy: z.object({
    vendorId: z.string().min(1), purchaseOrder: z.string().min(1),
    currency: z.string().length(3), recipient: address, token: address,
    maxInvoiceAmount: units, remainingPurchaseOrder: units, enabled: z.boolean(),
  }).strict(),
}).strict();
export type Bundle = z.infer<typeof bundleSchema>;
export type Verdict = { approved: boolean; reasons: string[] };

// Reasons stay inside the enclave. Only the browser's synthetic preview displays them.
export function evaluate(bundle: Bundle, now: number): Verdict {
  const { request: r, invoice: i, policy: p } = bundleSchema.parse(bundle);
  const reasons: string[] = [];
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid clock');
  if (!p.enabled) reasons.push('Purchase order disabled');
  if (r.expiresAt <= now || r.expiresAt > now + 86400) reasons.push('Request expired or validity exceeds 24 hours');
  if (BigInt(r.amount) === 0n) reasons.push('Amount must be positive');
  if (i.alreadyPaid) reasons.push('Invoice already paid');
  if (i.vendorId !== p.vendorId || i.purchaseOrder !== p.purchaseOrder) reasons.push('Vendor or purchase order mismatch');
  if (i.currency !== p.currency) reasons.push('Currency mismatch');
  if (r.recipient !== i.recipient || i.recipient !== p.recipient) reasons.push('Recipient does not match purchase order');
  if (r.token !== p.token) reasons.push('Token does not match policy');
  if (r.amount !== i.amount) reasons.push('Payment amount differs from invoice');
  if (BigInt(i.amount) > BigInt(p.maxInvoiceAmount)) reasons.push('Invoice exceeds private approval limit');
  if (BigInt(i.amount) > BigInt(p.remainingPurchaseOrder)) reasons.push('Invoice exceeds remaining purchase order');
  return { approved: reasons.length === 0, reasons };
}

export function paymentCommitment(r: Bundle['request']): Hex {
  return keccak256(encodeAbiParameters(
    parseAbiParameters('bytes32 requestId, uint256 chainId, address consumer, address recipient, address token, uint256 amount, uint64 expiresAt'),
    [r.id, BigInt(r.chainId), r.consumer, r.recipient, r.token, BigInt(r.amount), BigInt(r.expiresAt)],
  ));
}

export function encodeDecision(bundle: Bundle, approved: boolean): Hex {
  return encodeAbiParameters(
    parseAbiParameters('bytes32 requestId, bytes32 commitment, bool approved, uint64 expiresAt'),
    [bundle.request.id, paymentCommitment(bundle.request), approved, BigInt(bundle.request.expiresAt)],
  );
}
