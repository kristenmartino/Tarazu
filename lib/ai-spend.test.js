import { it,expect,vi,beforeEach,afterEach } from "vitest";
import { spendEnvelope,reserveProviderSpend } from "./ai-spend";
import { getSupabase } from "./supabase";
vi.mock("./supabase",()=>({getSupabase:vi.fn()}));
const abortSignal=vi.fn(); const rpc=vi.fn(()=>({abortSignal}));
beforeEach(()=>{getSupabase.mockReturnValue({rpc});abortSignal.mockResolvedValue({data:{allowed:true,reserved:1000000},error:null});vi.spyOn(console,'error').mockImplementation(()=>{});});
afterEach(()=>vi.restoreAllMocks());
it('uses UTF-8 bytes with overhead, doubled rates and the maximum output for each attempt',()=>{
 const m=[{role:'user',content:'é日本'}]; const bytes=Buffer.byteLength(JSON.stringify(m),'utf8');
 expect(spendEnvelope('claude-opus-4-8',m,8000)).toEqual({bytes,amount:(bytes+4096)*10+400000});
 expect(spendEnvelope('claude-sonnet-4-6',m,2400).amount).toBe((bytes+4096)*6+72000);
});
it.each(['unknown','constructor','claude-opus-4-8-fast'])('requires reviewed model pricing: %s',m=>expect(()=>spendEnvelope(m,[],1)).toThrow());
it.each([0,1.5,16001,NaN])('rejects unreviewed output limits %s',n=>expect(()=>spendEnvelope('claude-opus-4-8',[],n)).toThrow());
it('rejects oversize context rather than guessing its cost',()=>expect(()=>spendEnvelope('claude-opus-4-8',[{content:'x'.repeat(150001)}],1)).toThrow());
it('durably reserves before authorizing provider work',async()=>{
 expect(await reserveProviderSpend('claude-opus-4-8',[],100)).toEqual({allowed:true});
 expect(rpc).toHaveBeenCalledWith('reserve_ai_spend',{p_amount:45980,p_model:'claude-opus-4-8',p_input_bytes:2,p_output_tokens:100});
 expect(abortSignal.mock.calls.at(-1)[0]).toBeInstanceOf(AbortSignal);
});
it.each(['spend_limit','ai_paused'])('returns a manual-work fallback on %s',async reason=>{
 abortSignal.mockResolvedValue({data:{allowed:false,reason}});
 expect(await reserveProviderSpend('claude-opus-4-8',[],100)).toMatchObject({allowed:false,status:reason==='ai_paused'?503:429});
});
it.each([null,{allowed:true},{allowed:true,reserved:1},{allowed:true,reserved:10000001},{allowed:'yes'},{allowed:false,reason:'unknown'}])('fails closed on malformed budget response %j',async data=>{
 abortSignal.mockResolvedValue({data});expect(await reserveProviderSpend('claude-opus-4-8',[],100)).toMatchObject({allowed:false,status:503});
});
it('fails closed on missing DB, rejected or errored transport',async()=>{
 getSupabase.mockReturnValue(null);expect((await reserveProviderSpend('claude-opus-4-8',[],100)).allowed).toBe(false);
 getSupabase.mockReturnValue({rpc});abortSignal.mockRejectedValue(new Error('private credentials'));
 expect((await reserveProviderSpend('claude-opus-4-8',[],100)).allowed).toBe(false);
 abortSignal.mockResolvedValue({data:{allowed:true,reserved:1000000},error:{message:'private'}});
 expect((await reserveProviderSpend('claude-opus-4-8',[],100)).allowed).toBe(false);
 expect(JSON.stringify(console.error.mock.calls)).not.toContain('private');
});
