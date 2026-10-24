// @vitest-environment node
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
let calls;let existing;let issues;let health;
beforeEach(()=>{
 vi.resetModules();calls=[];existing=[];issues=[];health={status:'ok',problems:[]};
 vi.stubEnv('GITHUB_REPOSITORY','owner/test');vi.stubEnv('GH_TOKEN','secret-token');vi.stubEnv('SUPABASE_ACCESS_TOKEN','database-token');vi.stubEnv('GITHUB_RUN_ID','123');vi.stubEnv('MONITOR_TEST','false');vi.stubEnv('GITHUB_STEP_SUMMARY','');
 vi.spyOn(console,'log').mockImplementation(()=>{});
 vi.stubGlobal('fetch',vi.fn(async(url,opts={})=>{
  calls.push({url,opts});
  if(url.endsWith('/api/health'))return Response.json(health);
  if(url.includes('api.github.com')){
   if((opts.method||'GET')==='GET')return Response.json(existing);
   const body=JSON.parse(opts.body);issues.push(body);return Response.json({number:7,html_url:'https://github.com/owner/test/issues/7'});
  }
  return new Response('ok');
 }));
});
afterEach(()=>{process.exitCode=0;vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('does not open an incident when checks are healthy',async()=>{await import('./monitor-launch.mjs');expect(issues).toHaveLength(0);expect(calls.some(c=>c.url.includes('database/query'))).toBe(true);});
it('opens an assigned incident containing fixed categories only',async()=>{
 health={status:'attention',problems:['ai_spend_warning']};await import('./monitor-launch.mjs');expect(issues[0]).toMatchObject({assignees:['kristenmartino']});expect(issues[0].body).toContain('ai_spend_warning');expect(JSON.stringify(issues)).not.toContain('secret-token');expect(process.exitCode).toBe(1);
});
it('deduplicates unchanged warnings',async()=>{
 health={status:'attention',problems:['ai_spend_warning']};existing=[{number:7,title:'[Tarazu operations] Production needs attention',body:'<!-- tarazu-monitor:ai_spend_warning -->'}];await import('./monitor-launch.mjs');expect(issues).toHaveLength(0);expect(process.exitCode||0).toBe(0);
});
it('notifies once when an existing incident changes categories',async()=>{
 health={status:'attention',problems:['ai_failures']};existing=[{number:7,title:'[Tarazu operations] Production needs attention',body:'<!-- tarazu-monitor:ai_spend_warning -->'}];await import('./monitor-launch.mjs');expect(issues).toHaveLength(2);expect(issues[1].body).toContain('ai_failures');expect(process.exitCode).toBe(1);
});
it('closes only the workflow incident after recovery',async()=>{
 existing=[{number:7,title:'[Tarazu operations] Production needs attention'}];await import('./monitor-launch.mjs');expect(issues.at(-1)).toEqual({state:'closed',state_reason:'completed'});
});
it('labels and closes a test without claiming an outage',async()=>{
 vi.stubEnv('MONITOR_TEST','true');await import('./monitor-launch.mjs');expect(issues[0].title).toContain('TEST');expect(issues[0].body).toContain('No outage');expect(issues.at(-1).state).toBe('closed');expect(process.exitCode||0).toBe(0);
});
