import { z } from 'zod';
import { keccak256, toHex } from 'viem';
import { batchFixture, evaluateBatch, type Batch } from './batch';
import { parseCsv } from './csv';

export const demoTreasury = '0x9ce987f98853314ca5d139f0016d02ba521477a9' as const;
export const demoToken = '0x6ddfba3c4633710ac948b5261ffda54d86dc354a' as const;
export const paymentTransactions = ['0x18eb2dc63714a93fb3ae34889b0750bd189e54f521732d9b8392ebc9a8309266','0xd4e20e837f2b1e8f86feed2a5d78d414223c2d836b8354c7ac8830f31d52df07'] as const;
export type Invoice = { invoice: string; description: string; vendor: string; purchaseOrder: string; recipient: string; amount: string };
export type Reservation = { identity: string; invoice: string; vendor: string; purchaseOrder: string; requestId: string; recipient: string; amount: string; run: string; status: 'reserved'|'paid'|'released'; binding: 'preview'|'sepolia'; txHash?: string };
export type LedgerState = { version: 1; revision: number; reservations: Reservation[]; runs: { id: string; createdAt: number; results: ReturnType<typeof evaluateBatch>['details'] }[]; seeded: boolean; snapshot?: { revision: number; batch: Batch } };
export const emptyLedger = (): LedgerState => ({ version: 1, revision: 0, reservations: [], runs: [], seeded: false });
export const identity = (vendor: string, invoice: string) => JSON.stringify([vendor, invoice]);
export function canonical(value: string) { return value.normalize('NFKC').trim().toUpperCase(); }
export const invoiceSchema = z.object({
 invoice: z.string().transform(canonical).pipe(z.string().regex(/^[A-Z0-9][A-Z0-9._-]{0,79}$/)),
 description: z.string().trim().min(1).max(100),
 vendor: z.enum(['NORTHSTAR','ORBIT']), purchaseOrder: z.enum(['PO-2026-042','PO-2026-088']),
 recipient: z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(s=>s.toLowerCase()),
 amount: z.string().regex(/^(0|[1-9][0-9]{0,8})(\.[0-9]{1,6})?$/).refine(s=>Number(s)>0,'Amount must be positive'),
}).strict();
export const csvHeaders = ['invoice','description','vendor','purchaseOrder','recipient','amount'];
export function importInvoices(csv: string): Invoice[] {
 const rows=parseCsv(csv); if(rows.length<2||rows.length>21)throw new Error('Import 1–20 invoice rows');
 if(JSON.stringify(rows[0])!==JSON.stringify(csvHeaders))throw new Error(`CSV columns must be: ${csvHeaders.join(',')}`);
 return rows.slice(1).map((row,i)=>{if(row.length!==6)throw new Error(`Row ${i+2}: expected 6 columns`);const result=invoiceSchema.safeParse(Object.fromEntries(csvHeaders.map((h,j)=>[h,row[j]])));if(!result.success)throw new Error(`Row ${i+2}: invalid ${result.error.issues[0]?.path[0] ?? 'invoice'}`);return result.data;});
}
export const units = (value: string) => { const [whole,fraction='']=value.split('.');return (BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'))).toString(); };
function remaining(state: LedgerState, vendor: string) {
 const total=vendor==='NORTHSTAR'?6000000000n:3000000000n;
 return total-state.reservations.filter(r=>r.vendor===vendor&&r.status!=='released').reduce((s,r)=>s+BigInt(r.amount),0n);
}
export function ledgerView(state: LedgerState) {
 return {...state,mode:'persistent-synthetic-ledger',creExecution:false,policies:[
  {vendor:'NORTHSTAR',purchaseOrder:'PO-2026-042',recipient:'0x2222222222222222222222222222222222222222',budget:'6000000000',available:remaining(state,'NORTHSTAR').toString(),limit:'5000000000'},
  {vendor:'ORBIT',purchaseOrder:'PO-2026-088',recipient:'0x5555555555555555555555555555555555555555',budget:'3000000000',available:remaining(state,'ORBIT').toString(),limit:'5000000000'},
 ]};
}
export function invoiceBatch(state: LedgerState, rows: Invoice[], now: number, run: string): Batch {
 const fixture=batchFixture(now,6000,demoTreasury,demoToken);
 return {batchId:keccak256(toHex(run)),snapshotAt:now,policyVersion:`ledger-${state.revision}`,entries:rows.map((row,i)=>{
  const bundle=structuredClone(fixture.entries[row.vendor==='ORBIT'?4:0].bundle);
  bundle.request.id=keccak256(toHex(`${run}:${i}`));bundle.request.amount=bundle.invoice.amount=units(row.amount);
  bundle.request.recipient=bundle.invoice.recipient=row.recipient as `0x${string}`;
  bundle.invoice.purchaseOrder=row.purchaseOrder;
  bundle.policy.remainingPurchaseOrder=remaining(state,row.vendor).toString();
  bundle.invoice.alreadyPaid=state.reservations.some(r=>r.identity===identity(row.vendor,row.invoice)&&r.status!=='released');
  return {invoiceKey:row.invoice,label:row.description,bundle};
 })};
}
export function reserve(state: LedgerState, rawRows: unknown, now: number, run: string) {
 const rows=z.array(invoiceSchema).min(1).max(20).parse(rawRows);
 if(state.runs.length>=100)throw new Error('Demo workspace limit reached; start a new workspace');
 if(state.runs.some(r=>r.id===run))throw new Error('Run already exists');
 const batch=invoiceBatch(state,rows,now,run),result=evaluateBatch(batch,now);
 const next=structuredClone(state);
 result.details.forEach((d,i)=>{
  const row=rows[i];const existing=state.reservations.find(r=>r.identity===identity(row.vendor,row.invoice)&&r.status!=='released');
  if(existing)d.reasons=d.reasons.map(reason=>reason==='Invoice already paid'?existing.status==='paid'?'Invoice already paid in an earlier run':'Invoice reserved in an earlier run':reason);
  if(d.approved)next.reservations.push({identity:identity(row.vendor,row.invoice),invoice:row.invoice,vendor:row.vendor,purchaseOrder:row.purchaseOrder,requestId:batch.entries[i].bundle.request.id,recipient:row.recipient,amount:units(row.amount),run,status:'reserved',binding:'preview'});
 });
 next.runs.push({id:run,createdAt:now,results:result.details});next.revision++;next.snapshot={revision:next.revision,batch};
 return {state:next,result:{...result,decisions:result.decisions.map(d=>({...d,expiresAt:d.expiresAt.toString()}))}};
}
export function releasePreview(state: LedgerState, run: string) {
 const next=structuredClone(state);const rows=next.reservations.filter(r=>r.run===run&&r.status==='reserved');
 if(!rows.length||rows.some(r=>r.binding!=='preview'))throw new Error('Only unpaid preview reservations can be released');
 rows.forEach(r=>r.status='released');next.revision++;return next;
}
export function seedSepolia(state: LedgerState, now: number) {
 if(state.seeded||state.runs.length)throw new Error('Load the Sepolia example into an empty workspace');
 const next=structuredClone(state),batch=batchFixture(now,6000,demoTreasury,demoToken);
 for(const i of [0,4]){const e=batch.entries[i],r=e.bundle.request;const vendor=i===0?'NORTHSTAR':'ORBIT';next.reservations.push({identity:identity(vendor,e.invoiceKey),invoice:e.invoiceKey,vendor,purchaseOrder:e.bundle.policy.purchaseOrder,requestId:r.id,recipient:r.recipient,amount:r.amount,run:'recorded-sepolia',status:'reserved',binding:'sepolia'});}
 next.seeded=true;next.revision++;return next;
}
export type ConfirmedPayment={requestId:string;recipient:string;token:string;amount:string;txHash:string};
export function reconcile(state: LedgerState, payment: ConfirmedPayment) {
 const next=structuredClone(state);const r=next.reservations.find(r=>r.requestId===payment.requestId&&r.binding==='sepolia');
 if(!r||r.recipient!==payment.recipient.toLowerCase()||r.amount!==payment.amount||payment.token.toLowerCase()!==demoToken)throw new Error('Confirmed payment does not match a reserved invoice');
 if(r.status==='paid'){if(r.txHash!==payment.txHash)throw new Error('Invoice already reconciled from another transaction');return next;}
 if(r.status!=='reserved')throw new Error('Invoice is not reserved');
 r.status='paid';r.txHash=payment.txHash;next.revision++;return next;
}
