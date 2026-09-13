// Read-only research probe. This is not a payment authorization or CRE execution.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const repository='Lawrence-eth/velum';
const api=path=>JSON.parse(execFileSync('gh',['api',`repos/${repository}/${path}`],{encoding:'utf8',maxBuffer:2000000}));
const policy={repositoryId:1366413547,workflowId:355961046,headSha:'f80c506fbd178750b58c4791d751bdde47545824',branch:'main',event:'push'};
const select=r=>({id:r.id,repositoryId:r.repository.id,workflowId:r.workflow_id,headSha:r.head_sha,branch:r.head_branch,event:r.event,status:r.status,conclusion:r.conclusion,attempt:r.run_attempt,url:r.html_url,updatedAt:r.updated_at});
const matching=select(api('actions/runs/34734168531'));
const earlier=select(api('actions/runs/34733699456'));
function matches(r){return r.repositoryId===policy.repositoryId&&r.workflowId===policy.workflowId&&r.headSha===policy.headSha&&r.branch===policy.branch&&r.event===policy.event&&r.status==='completed'&&r.conclusion==='success';}
const checks=[];
assert.ok(matches(matching));checks.push({case:'actual successful run for pinned revision',source:'live GitHub API',accepted:true});
assert.ok(!matches(earlier));checks.push({case:'actual successful run for an earlier revision',source:'live GitHub API',accepted:false});
for(const [name,patch] of [['different repository',{repositoryId:1}],['different workflow',{workflowId:1}],['failed conclusion',{conclusion:'failure'}],['unfinished run',{status:'in_progress'}],['different branch',{branch:'attacker'}],['different event',{event:'pull_request'}]]){assert.ok(!matches({...matching,...patch}));checks.push({case:name,source:'explicitly mutated test fixture',accepted:false});}
const out={checkedAt:new Date().toISOString(),purpose:'Read-only feasibility probe for a proposed work-evidence connector',creExecution:false,paymentAuthorization:false,settlement:false,policy,matching,earlier,checks,limitations:['The repository is public and controlled by the demo team.','A successful workflow does not prove code quality or commercial acceptance.','Trusted workflow content, required jobs, maintainer acceptance, freshness, reservations and payout binding are not implemented by this probe.']};
writeFileSync('evidence/milestone-feasibility.json',JSON.stringify(out,null,2)+'\n');console.log('Read-only GitHub milestone feasibility: 2 live records and 6 explicit mutation cases passed. No CRE run or payment performed.');
