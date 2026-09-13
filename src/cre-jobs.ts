import {workEvidenceSchema,type WorkBinding} from './work-order';
import {z} from 'zod';
import {decodeAbiParameters} from 'viem';
import {batchReportAbi} from './batch';
import {proposalSchema,type Proposal} from './agent';
import type {Bundle,Verdict} from './policy';
export type AgentCapture={ok:true;runId:string;createdAt:number;source:'live-model'|'injected-proposal'|'operator-corrected';scenario:'clean'|'malicious';synthetic:true;creExecution:false;settlement:false;proposal:Proposal;gate:Verdict;commitment:string;bundle:Bundle;raw?:string;model?:string;creAccess?:string;work?:WorkBinding};
export type JobResponse={ok:boolean;status?:string;error?:string;execution?:JobResult};
export const jobResultSchema=z.object({
 workEvidence:workEvidenceSchema.optional(),creExecution:z.literal(true),proposal:proposalSchema,policyApproved:z.boolean(),policyReasons:z.array(z.string().max(150)),deliveryAccepted:z.literal(true),settlementAccepted:z.boolean(),
 treasuryBefore:z.string().regex(/^\d+$/),treasuryAfter:z.string().regex(/^\d+$/),paid:z.string().regex(/^\d+$/),requestStatus:z.number().int(),
 requestId:z.string().regex(/^0x[0-9a-f]{64}$/),commitment:z.string().regex(/^0x[0-9a-f]{64}$/),encodedPayload:z.string().regex(/^0x[0-9a-f]+$/).max(20000),
 reportBytes:z.number().int().positive(),deliveryGas:z.string(),settlementGas:z.string(),compiler:z.string().max(200),sourceSha256:z.record(z.string()),
 treasury:z.string(),token:z.string(),workflowMode:z.literal('CRE CLI confidential-handler simulation'),settlementMode:z.enum(['VM-local Solidity execution with mock forwarder','Journal-backed local Solidity with mock forwarder']),creLog:z.string().max(60000),executedAt:z.string(),
}).strict();
export type JobResult=z.infer<typeof jobResultSchema>;
export function checkJobResult(result:unknown,proposal:unknown){const parsed=jobResultSchema.parse(result),expected=proposalSchema.parse(proposal);const [, ,decisions]=decodeAbiParameters(batchReportAbi,parsed.encodedPayload as `0x${string}`);if(decisions.length!==1||decisions[0].requestId!==parsed.requestId||decisions[0].commitment!==parsed.commitment||decisions[0].approved!==parsed.policyApproved)throw Error('Report mismatch');if(JSON.stringify(parsed.proposal)!==JSON.stringify(expected))throw Error('Proposal mismatch');if(parsed.policyApproved!==parsed.settlementAccepted)throw Error('Settlement mismatch');if(BigInt(parsed.treasuryBefore)-BigInt(parsed.treasuryAfter)!==BigInt(parsed.paid))throw Error('Balance mismatch');if(parsed.settlementAccepted?BigInt(parsed.paid)!==BigInt(expected.amount.replace('.',''))*10000n:parsed.paid!=='0')throw Error('Transfer mismatch');return parsed;}
