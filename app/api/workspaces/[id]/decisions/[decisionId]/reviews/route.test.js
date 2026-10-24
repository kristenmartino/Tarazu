import { beforeEach, it, expect, vi } from 'vitest';
const db=vi.hoisted(()=>({from:vi.fn()}));
vi.mock('../../../../../../../lib/api-auth',()=>({withAuth:fn=>fn('user',db),verifyWorkspaceOwner:vi.fn(async()=>true)}));
vi.mock('../../../../../../../lib/revisions',()=>({resolveActor:vi.fn(async()=>({id:'user',name:'Owner'}))}));
import { verifyWorkspaceOwner } from '../../../../../../../lib/api-auth';
import { POST } from './route';
const signalId='11111111-1111-4111-8111-111111111111';
const payload={action:'revise',outcome:'Unknown result',next_action:'Try a smaller test',new_evidence:'Reported new concern',signal_ids:[signalId]};
const params={params:Promise.resolve({id:'ws',decisionId:'d'})};
let decision, signals, insert, queries;
function setup({missing=false,failed=false,evidenceError=false}={}){
 decision={id:'d',workspace_id:'ws',title:'Original',final_rationale:'Original reasoning',recommendation_snapshot:{frozen:true}};
 signals=[{id:signalId,body:'Synthetic research, not real',title:'Test source'}];
 insert=vi.fn(value=>({select:()=>({single:async()=>({data:value,error:failed?{message:'db'}:null})})}));
 queries=[];
 db.from.mockImplementation(table=>{
  const q={select:vi.fn(()=>q),eq:vi.fn(()=>q),in:vi.fn(async()=>({data:signals,error:evidenceError?{}:null})),single:vi.fn(async()=>({data:missing?null:decision})),insert};queries.push({table,q});return q;
 });
}
beforeEach(()=>{vi.clearAllMocks();verifyWorkspaceOwner.mockResolvedValue(true);setup();});
const request=data=>({json:async()=>data});
it('authorizes workspace before reading or writing anything',async()=>{verifyWorkspaceOwner.mockResolvedValueOnce(false);expect((await POST(request(payload),params)).status).toBe(404);expect(db.from).not.toHaveBeenCalled();});
it('appends authoritative snapshots and never updates original decisions',async()=>{
 const result=await POST(request({...payload,decision_snapshot:{forged:true},reviewed_by_name:'Impostor'}),params);
 expect(result.status).toBe(201);const saved=await result.json();
 expect(saved.decision_snapshot).toEqual(decision);expect(saved.reviewed_by_name).toBe('Owner');expect(saved.evidence_snapshots[0].body).toContain('Synthetic');
 expect(saved.workspace_id).toBe('ws');expect(saved.decision_id).toBe('d');
 expect(queries[0].q.eq).toHaveBeenCalledWith('workspace_id','ws');expect(queries[1].q.eq).toHaveBeenCalledWith('workspace_id','ws');
 expect(queries.map(q=>q.table)).toEqual(['decisions','signals','decision_reviews']);
});
it('rejects unknown or cross-workspace decision and evidence references',async()=>{
 setup({missing:true});expect((await POST(request(payload),params)).status).toBe(404);expect(insert).not.toHaveBeenCalled();
 setup();signals=[];expect((await POST(request(payload),params)).status).toBe(400);expect(insert).not.toHaveBeenCalled();
});
it('retains failures and validation as errors rather than pretending review saved',async()=>{
 for(const bad of [{...payload,action:'approve'},{...payload,outcome:''},{...payload,signal_ids:['not-uuid']},{...payload,next_review_date:'2026-02-30'}]) expect((await POST(request(bad),params)).status).toBe(400);
 setup({failed:true});expect((await POST(request(payload),params)).status).toBe(500);
 setup({evidenceError:true});expect((await POST(request(payload),params)).status).toBe(500);expect(insert).not.toHaveBeenCalled();
});
it('allows review with explicitly unknown outcome and no attached sources',async()=>{
 expect((await POST(request({...payload,action:'keep',signal_ids:[]}),params)).status).toBe(201);
 expect(queries.map(q=>q.table)).toEqual(['decisions','decision_reviews']);
});
