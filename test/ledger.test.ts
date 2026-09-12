import {test,expect} from 'bun:test';
import {emptyLedger,review,reserve,releasePreview,seedSepolia,reconcile,ledgerView,importInvoices,paymentTransactions} from '../src/ledger';
import {parseCsv} from '../src/csv';
import {extractPayment} from '../src/chain-reconciliation';
import {encodeAbiParameters,encodeEventTopics,parseAbiItem} from 'viem';
const now=1700000000;
const row={invoice:'NS-101',description:'Design',vendor:'NORTHSTAR',purchaseOrder:'PO-2026-042',recipient:'0x2222222222222222222222222222222222222222',amount:'4200'};
test('persistent reservations block duplicate IDs and shared budget across runs',()=>{
 const first=reserve(emptyLedger(),[row],now,'first');
 const restored=JSON.parse(JSON.stringify(first.state));
 const second=reserve(restored,[{...row,invoice:' ns-101 '},{...row,invoice:'NS-102',amount:'3800'}],now,'second');
 expect(second.result.decisions.map(d=>d.approved)).toEqual([false,false]);
 expect(second.result.details[0].reasons).toContain('Invoice reserved in an earlier run');
 expect(ledgerView(second.state).policies[0].available).toBe('1800000000');
});
test('release restores preview budget; paid and chain-bound reservations cannot be released',()=>{
 const first=reserve(emptyLedger(),[row],now,'first');
 const released=releasePreview(first.state,'first');
 expect(ledgerView(released).policies[0].available).toBe('6000000000');
 expect(reserve(released,[row],now,'new').result.decisions[0].approved).toBe(true);
 expect(()=>releasePreview(seedSepolia(emptyLedger(),now),'recorded-sepolia')).toThrow();
});
test('reconciliation persists paid identity, preserves reserved budget, and is idempotent',()=>{
 const seeded=seedSepolia(emptyLedger(),now),r=seeded.reservations[0];
 const payment={...r,token:'0x6ddfba3c4633710ac948b5261ffda54d86dc354a',txHash:paymentTransactions[0]};
 const paid=reconcile(seeded,payment);expect(paid.reservations[0].status).toBe('paid');
 expect(reconcile(paid,payment)).toEqual(paid);
 expect(ledgerView(paid).policies[0].available).toBe('1800000000');
 const next=reserve(JSON.parse(JSON.stringify(paid)),[row],now,'later');
 expect(next.result.decisions[0].approved).toBe(false);expect(next.result.details[0].reasons).toContain('Invoice already paid in an earlier run');
 for(const altered of [{amount:'1'},{recipient:'0x4444444444444444444444444444444444444444'},{token:'0x3333333333333333333333333333333333333333'},{requestId:'0x'+'0'.repeat(64)}])expect(()=>reconcile(seeded,{...payment,...altered})).toThrow();
});
test('CSV uses exact decimal units, validates policies and handles quoted fields',()=>{
 const csv='invoice,description,vendor,purchaseOrder,recipient,amount\r\nNS-101,"Design, with ""review""",NORTHSTAR,PO-2026-042,0x2222222222222222222222222222222222222222,4200.000001\r\n';
 const rows=importInvoices(csv);expect(rows[0].description).toBe('Design, with "review"');
 expect(reserve(emptyLedger(),rows,now,'csv').result.approvedAmount).toBe('4200000001');
 for(const bad of [csv.replace('4200.000001','1e3'),csv.replace('4200.000001','-1'),csv.replace('4200.000001','0.0000001'),csv.replace('NORTHSTAR','UNKNOWN')])expect(()=>importInvoices(bad)).toThrow();
 expect(()=>parseCsv('"unclosed')).toThrow();expect(()=>parseCsv('"closed"junk')).toThrow();expect(()=>parseCsv('a'.repeat(16385))).toThrow();
 expect(parseCsv('a,b\n"line\nbreak",c')).toEqual([['a','b'],['line\nbreak','c']]);
});
test('held wallet can be corrected and accepted; policies are separate from input',()=>{
 const first=reserve(emptyLedger(),[{...row,recipient:'0x4444444444444444444444444444444444444444'}],now,'wrong');
 expect(first.result.decisions[0].approved).toBe(false);expect(first.state.reservations.length).toBe(0);
 expect(reserve(first.state,[row],now,'corrected').result.decisions[0].approved).toBe(true);
 expect(reserve(emptyLedger(),[{...row,purchaseOrder:'PO-2026-088'}],now,'wrong-po').result.decisions[0].approved).toBe(false);
});
test('chain verifier requires successful event from exact treasury',()=>{
 const abi=parseAbiItem('event PaymentSettled(bytes32 indexed requestId, address indexed recipient, address token, uint256 amount)');
 const r=seedSepolia(emptyLedger(),now).reservations[0];
 const log={address:'0x9ce987f98853314ca5d139f0016d02ba521477a9',topics:encodeEventTopics({abi:[abi],eventName:'PaymentSettled',args:{requestId:r.requestId as `0x${string}`,recipient:r.recipient as `0x${string}`}}) as `0x${string}`[],data:encodeAbiParameters([{type:'address'},{type:'uint256'}],['0x6ddfba3c4633710ac948b5261ffda54d86dc354a',BigInt(r.amount)])};
 const receipt={status:'success',transactionHash:paymentTransactions[0],logs:[log]};
 expect(extractPayment(receipt).amount).toBe(r.amount);
 expect(()=>extractPayment({...receipt,status:'reverted'})).toThrow();expect(()=>extractPayment({...receipt,logs:[{...log,address:row.recipient}]})).toThrow();expect(()=>extractPayment({...receipt,logs:[log,log]})).toThrow();
});

test('idempotent reservation retries preserve original decision and ledger revision',()=>{
 const first=reserve(emptyLedger(),[row],now,'stable-key');
 const retry=reserve(first.state,[row],now+20,'stable-key',0);
 expect(retry.state).toEqual(first.state);expect(retry.result).toEqual(first.result);
 expect(()=>reserve(first.state,[{...row,amount:'1'}],now,'stable-key')).toThrow('different invoices');
});
test('stale review cannot reserve after another tab changes the ledger',()=>{
 const first=reserve(emptyLedger(),[row],now,'tab-one',0);
 expect(()=>reserve(first.state,[{...row,invoice:'NS-104',amount:'100'}],now,'tab-two',0)).toThrow('Ledger changed');
 expect(first.state.runs.length).toBe(1);
});


test('read-only review does not mutate ledger and public receipt omits operator fields',()=>{
 const state=emptyLedger(),before=JSON.stringify(state);const result=review(state,[row],now);
 expect(result.approvedAmount).toBe('4200000000');expect(JSON.stringify(state)).toBe(before);
 const saved=reserve(state,[row],now,'receipt-run',result.revision);
 const encoded=JSON.stringify(saved.result.receipt);
 for(const secret of ['NS-101','NORTHSTAR','Design','purchaseOrder','remainingPurchaseOrder','reasons','isolatedAmount'])expect(encoded).not.toContain(secret);
 expect(ledgerView(saved.state)).not.toHaveProperty('snapshot');
});
