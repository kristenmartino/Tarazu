import {it,expect,vi,beforeEach} from 'vitest';
import {POST} from './route';
import {getSupabase} from '../../../lib/supabase';
vi.mock('../../../lib/supabase',()=>({getSupabase:vi.fn()}));
const abortSignal=vi.fn();const rpc=vi.fn(()=>({abortSignal}));
beforeEach(()=>{vi.clearAllMocks();abortSignal.mockResolvedValue({error:null});getSupabase.mockReturnValue({rpc});});
const req=(body,origin='https://tarazu.app')=>new Request('https://tarazu.app/api/usage',{method:'POST',headers:{origin},body:JSON.stringify(body)});
it('accepts only the closed aggregate schema',async()=>{
 expect((await POST(req({event:'brief_saved',mode:'demo'}))).status).toBe(204);
 expect(rpc).toHaveBeenCalledWith('record_usage_count',{p_event:'brief_saved',p_mode:'demo'});
});
it.each([{event:'brief_saved',mode:'demo',email:'private@example.com'},{event:'candidate-title',mode:'demo'},{event:'brief_saved',mode:'secret-workspace'},null])('rejects private/unknown payload %j',async body=>{
 expect((await POST(req(body))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();
});
it('rejects cross-origin and oversize requests without DB work',async()=>{
 expect((await POST(req({event:'demo_opened',mode:'demo'},'https://other.site'))).status).toBe(403);
 expect((await POST(req({event:'x'.repeat(210),mode:'demo'}))).status).toBe(413);expect(rpc).not.toHaveBeenCalled();
});
it('handles unavailable aggregation without leaking details',async()=>{
 abortSignal.mockRejectedValue(new Error('private database URL'));const r=await POST(req({event:'brief_saved',mode:'demo'}));expect(r.status).toBe(503);expect(await r.text()).toBe('');
});
