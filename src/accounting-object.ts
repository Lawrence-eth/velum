import { DurableObject } from 'cloudflare:workers';
import { emptyLedger, ledgerView, reserve, releasePreview, seedSepolia, reconcile, importInvoices, type LedgerState } from './ledger';
import { verifySepoliaPayment } from './chain-reconciliation';

export class AccountingLedger extends DurableObject<Env> {
 constructor(ctx: DurableObjectState, env: Env) {
  super(ctx,env);
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)');
  ctx.storage.sql.exec('INSERT OR IGNORE INTO ledger(id,state) VALUES(1,?)',JSON.stringify(emptyLedger()));
 }
 private load(): LedgerState { return JSON.parse(this.ctx.storage.sql.exec<{state:string}>('SELECT state FROM ledger WHERE id=1').one().state); }
 private save(state: LedgerState) { this.ctx.storage.sql.exec('UPDATE ledger SET state=? WHERE id=1',JSON.stringify(state)); }
 view() { return ledgerView(this.load()); }
 snapshot() {
  const state=this.load();
  if(!state.snapshot || state.snapshot.revision!==state.revision) return {error:'Reserve a new run after the latest ledger change'};
  const now=Math.floor(Date.now()/1000);
  if(state.snapshot.batch.entries.some(e=>e.bundle.request.expiresAt<=now))return {error:'Snapshot payment window expired; reserve a new run'};
  return {...state.snapshot.batch,snapshotAt:now};
 }
 async act(action: string, input: Record<string,unknown>) {
  try {
   // External RPC must finish before entering the synchronous storage transaction.
   const payment=action==='reconcile'?await verifySepoliaPayment(String(input.txHash||'')):undefined;
   return this.ctx.storage.transactionSync(()=>{
    const state=this.load();
    if(action==='import'){return {ok:true,rows:importInvoices(String(input.csv||''))};}
    if(action==='reserve'){
     const result=reserve(state,input.rows,Math.floor(Date.now()/1000),crypto.randomUUID());this.save(result.state);
     return {ok:true,ledger:ledgerView(result.state),result:result.result};
    }
    const next=action==='release'?releasePreview(state,String(input.run||'')):action==='seed'?seedSepolia(state,Math.floor(Date.now()/1000)):action==='reconcile'&&payment?reconcile(state,payment):null;
    if(!next)throw new Error('Unknown action');this.save(next);return {ok:true,ledger:ledgerView(next)};
   });
  } catch(error) {
   // Avoid serializing input-bearing schema/RPC exceptions into public errors.
   const safe=['Import 1–20 invoice rows','Only unpaid preview reservations can be released','Load the Sepolia example into an empty workspace','Payment is not finalized yet; retry later','Confirmed payment does not match a reserved invoice','Invoice already reconciled from another transaction','Expected one payment event from the configured Sepolia treasury','Demo workspace limit reached; start a new workspace'];
   const message=error instanceof Error?error.message:'';
   return {ok:false,error:safe.includes(message)||/^Row \d+:|^CSV columns|^CSV must|^Unclosed CSV|^Unexpected .*CSV|^Remove blank CSV/.test(message)?message:'Invalid request or chain verification unavailable; no ledger changes were saved'};
  }
 }
}
