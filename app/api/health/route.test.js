import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {GET} from './route';
import {getSupabase} from '../../../lib/supabase';
vi.mock('../../../lib/supabase',()=>({getSupabase:vi.fn()}));
const abortSignal=vi.fn();
const healthy={enabled:true,budget:10000000,reserved:0,requests:0,recent_requests:0,recent_failures:0};
beforeEach(()=>{
 for(const n of ['ANTHROPIC_API_KEY','CLERK_SECRET_KEY','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'])vi.stubEnv(n,'configured-not-public');
 for(const n of ['AI_DAILY_QUOTA_PER_USER','AI_GLOBAL_DAILY_QUOTA','AI_GLOBAL_CONCURRENCY','ANTHROPIC_MODEL_ANALYSIS','ANTHROPIC_MODEL_SUGGESTIONS','AI_REQUESTS_ENABLED'])vi.stubEnv(n,'');
 getSupabase.mockReturnValue({rpc:()=>({abortSignal})});abortSignal.mockResolvedValue({data:healthy,error:null});
});
afterEach(()=>vi.unstubAllEnvs());
it('reports effective deployed limits without secret values or customer counts',async()=>{
 const r=await GET();expect(r.status).toBe(200);const d=await r.json();expect(d.status).toBe('ok');expect(d.capacity).toMatchObject({shared:100,perAccount:50,concurrent:3,rollingSpendCeilingUsd:10});expect(JSON.stringify(d)).not.toContain('configured-not-public');expect(d).not.toHaveProperty('requests');
});
it('reports spend, request and failure warning categories',async()=>{
 abortSignal.mockResolvedValue({data:{...healthy,reserved:8000000,requests:80,recent_requests:6,recent_failures:3}});
 expect((await (await GET()).json()).problems).toEqual(['ai_spend_warning','ai_requests_warning','ai_failures']);
});
it('reports a paused service without promising healthy AI',async()=>{abortSignal.mockResolvedValue({data:{...healthy,enabled:false}});expect((await (await GET()).json()).problems).toContain('ai_paused');});
it.each([null,{}, {...healthy,reserved:-1},{...healthy,budget:10000001}])('fails closed on invalid database health %j',async data=>{abortSignal.mockResolvedValue({data});expect((await GET()).status).toBe(503);});
it('reports missing configuration, unknown model and network failure safely',async()=>{
 vi.stubEnv('ANTHROPIC_MODEL_ANALYSIS','unknown');expect((await GET()).status).toBe(503);vi.stubEnv('ANTHROPIC_MODEL_ANALYSIS','');
 abortSignal.mockRejectedValue(new Error('secret'));expect((await GET()).status).toBe(503);
 vi.stubEnv('CLERK_SECRET_KEY','');expect((await GET()).status).toBe(503);
});
