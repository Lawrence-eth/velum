import {z} from 'zod';
import {keccak256,toHex} from 'viem';
import type {Batch} from './batch';
export const workTerms={id:'WO-101',title:'Payment review release',vendor:'Northstar Studio',amount:'2400.00',recipient:'0x2222222222222222222222222222222222222222',budget:'6000000000',repository:'Lawrence-eth/velum',repositoryId:1366413547,workflowId:355961046,workflowBlob:'5955271c83d9cda8628558cb94735cfa332ca479',acceptedSha:'f80c506fbd178750b58c4791d751bdde47545824',acceptedRun:34734168531,earlierRun:34733699456,branch:'main',event:'push',revision:'work-order-v1'} as const;
export const workBindingSchema=z.object({workspace:z.string().uuid(),identity:z.string().regex(/^0x[0-9a-f]{64}$/),evidenceRun:z.number().int().positive().safe(),termsRevision:z.literal('work-order-v1')}).strict();
export type WorkBinding=z.infer<typeof workBindingSchema>;
export const workEvidenceSchema=z.object({runId:z.number().int().safe(),repositoryId:z.number().int().safe(),workflowId:z.number().int().safe(),sha:z.string().regex(/^[0-9a-f]{40}$/),branch:z.string().max(200),event:z.string().max(100),status:z.string().max(100),conclusion:z.string().max(100).nullable(),workflowBlob:z.string().regex(/^[0-9a-f]{40}$/),observedAt:z.number().int().safe()}).strict();
export type WorkEvidence=z.infer<typeof workEvidenceSchema>;
export function workIdentity(workspace:string){return keccak256(toHex(`velum-work:${workspace}:${workTerms.id}`));}
export function workRequestId(run:string,binding:WorkBinding){return keccak256(toHex(JSON.stringify(['velum-work-request-v1',run,binding,workTerms])));}
export function workReasons(binding:WorkBinding,evidence:WorkEvidence,now:number){
 const b=workBindingSchema.parse(binding),e=workEvidenceSchema.parse(evidence),reasons:string[]=[];
 if(b.identity!==workIdentity(b.workspace))reasons.push('Work order identity mismatch');
 if(e.runId!==b.evidenceRun)reasons.push('Evidence run differs from the submitted reference');
 if(e.repositoryId!==workTerms.repositoryId||e.workflowId!==workTerms.workflowId)reasons.push('Evidence comes from an unapproved repository or workflow');
 if(e.sha!==workTerms.acceptedSha)reasons.push('Successful build belongs to a different revision');
 if(e.branch!==workTerms.branch||e.event!==workTerms.event)reasons.push('Evidence branch or trigger is not approved');
 if(e.status!=='completed'||e.conclusion!=='success')reasons.push('Required workflow has not completed successfully');
 if(e.workflowBlob!==workTerms.workflowBlob)reasons.push('Workflow definition differs from the accepted definition');
 if(e.observedAt>now||now-e.observedAt>120)reasons.push('Work evidence observation is stale');
 return reasons;
}
export function bindWorkBatch(batch:Batch,run:string,binding:WorkBinding){const b=structuredClone(batch);b.entries[0].bundle.request.id=workRequestId(run,binding);b.entries[0].invoiceKey=binding.identity;b.policyVersion=workTerms.revision;return b;}
