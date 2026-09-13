# Controlled integration test: simulated executor failure, then actual CRE recovery.
import json, socket, urllib.request, urllib.error, secrets, subprocess, time
from pathlib import Path
if subprocess.run(['pgrep','-x','cre'],stdout=subprocess.DEVNULL).returncode==0:raise RuntimeError('CRE is busy; retry when idle')
original=socket.getaddrinfo
socket.getaddrinfo=lambda host,*args,**kwargs:original('104.21.32.18' if host=='velum.aethe.me' else host,*args,**kwargs)
runner=Path('/home/ubuntu/.secrets/velum-cre-runner.env').read_text().strip().split('=',1)[1]
def api(body,key=None):
 h={'Content-Type':'application/json','User-Agent':'Velum-recovery-test'}
 if key:h['Authorization']='Bearer '+key
 req=urllib.request.Request('https://velum.aethe.me/api/agent?test='+secrets.token_hex(8),data=json.dumps(body).encode(),headers=h)
 try:
  with urllib.request.urlopen(req,timeout=20) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
subprocess.run(['systemctl','--user','stop','velum-cre-runner'],check=True)
try:
 code,opened=api({'action':'work-open'});assert code==200;access=opened['access']
 code,queued=api({'action':'work-run','scenario':'accepted','retry':secrets.token_hex(16)},access);assert code==200,queued
 job=queued['capture']['runId']
 code,failed=api({'action':'runner-result','id':job,'failed':True},runner);assert code==200 and failed['ok'],failed
 code,view=api({'action':'work-view'},access);assert view['status']=='uncertain' and view['budget']['reserved']=='2400000000'
 assert api({'action':'work-run','scenario':'accepted','retry':secrets.token_hex(16)},access)[0]==409
finally:subprocess.run(['systemctl','--user','start','velum-cre-runner'],check=True)
time.sleep(2)
code,resume=api({'action':'work-resume'},access);assert code==200 and resume['ok'],resume
for i in range(80):
 code,view=api({'action':'work-view'},access)
 if view['status'] in ['paid','uncertain']:break
 time.sleep(2)
assert view['status']=='paid',view.get('status')
assert len(view['attempts'])==1 and view['attempts'][0]['id']==job
assert view['attempts'][0]['execution']['paid']=='2400000000'
record={'checkedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'failureSource':'Explicit authenticated test injection before CLI execution','recoverySource':'Actual GitHub retrieval inside CRE CLI and local Solidity','checks':['uncertain result retains the reservation','new request cannot bypass uncertainty','recovery resumes the original job identity','one saved attempt settles exactly 2400 test tokens'],'job':job}
Path('evidence/work-resume.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2))
