import { describe, expect, test } from 'bun:test';
import { agentResult, modelResponseText, parseProposal, proposalBundle, systemPrompt, invoiceText } from '../src/agent';
import { evaluate } from '../src/policy';
const valid={invoiceRef:'NS-101' as const,recipient:'0x2222222222222222222222222222222222222222' as `0x${string}`,amount:'2400.00'};
describe('agent authority boundary',()=>{
 test('provider string and structured response envelopes preserve strict validation',()=>{for(const response of [valid,JSON.stringify(valid)])expect(parseProposal(modelResponseText({response}))).toEqual(valid);expect(()=>modelResponseText({})).toThrow()});
 test('valid extracted proposal passes separate trusted record',()=>expect(agentResult(valid,1000,'one').gate.approved).toBe(true));
 test('attacker wallet fails even with syntactically valid model output',()=>expect(agentResult({...valid,recipient:'0x4444444444444444444444444444444444444444'},1000,'two').gate.approved).toBe(false));
 test('model cannot increase or decrease canonical invoice amount',()=>{for(const amount of ['2400.01','2399.99','0.00','999999999.99'])expect(agentResult({...valid,amount},1000,'three').gate.approved).toBe(false)});
 test('extra policy and claimed authorization are rejected',()=>expect(()=>parseProposal(JSON.stringify({...valid,approved:true,policy:{enabled:true}}))).toThrow());
 test('model cannot select another trusted invoice',()=>expect(()=>parseProposal(JSON.stringify({...valid,invoiceRef:'NS-102'}))).toThrow());
 test('invalid or non-JSON output fails closed',()=>{for(const raw of ['approved','{}',JSON.stringify({...valid,amount:2400}),JSON.stringify({...valid,recipient:'attacker.eth'})])expect(()=>parseProposal(raw)).toThrow()});
 test('trusted policy changes apply independently of model response',()=>{const b=proposalBundle(valid,1000,'four');b.policy.enabled=false;expect(evaluate(b,1000).approved).toBe(false);b.policy.enabled=true;b.invoice.alreadyPaid=true;expect(evaluate(b,1000).approved).toBe(false)});
 test('private policy is absent from inference input',()=>{const input=systemPrompt+invoiceText.clean+invoiceText.malicious;expect(input).not.toContain('5000');expect(input).not.toContain('12000000000')});
});
