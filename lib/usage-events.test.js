import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {trackUsage,measurementAllowed,MEASUREMENT_KEY} from './usage-events';
beforeEach(()=>{localStorage.clear();vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:204})));});
afterEach(()=>vi.unstubAllGlobals());
it('does not measure without explicit opt-in',()=>{trackUsage('demo_opened','demo');expect(fetch).not.toHaveBeenCalled();});
it('sends exactly the allowlisted action and mode, with no cookies or referrer',()=>{
 localStorage.setItem(MEASUREMENT_KEY,'yes');trackUsage('brief_saved','demo');
 expect(fetch).toHaveBeenCalledWith('/api/usage',expect.objectContaining({credentials:'omit',referrerPolicy:'no-referrer',body:'{"event":"brief_saved","mode":"demo"}'}));
 trackUsage('private candidate text','demo');trackUsage('brief_saved','workspace-id');expect(fetch).toHaveBeenCalledTimes(1);
});
it('respects both browser privacy signals even after opt-in',()=>{
 localStorage.setItem(MEASUREMENT_KEY,'yes');vi.stubGlobal('navigator',{doNotTrack:'1'});expect(measurementAllowed()).toBe(false);
 vi.stubGlobal('navigator',{globalPrivacyControl:true});trackUsage('demo_opened','demo');expect(fetch).not.toHaveBeenCalled();
});
it('ignores transport and browser storage failures',()=>{
 localStorage.setItem(MEASUREMENT_KEY,'yes');fetch.mockImplementation(()=>{throw new Error('offline')});expect(()=>trackUsage('demo_opened','demo')).not.toThrow();
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked')});expect(measurementAllowed()).toBe(false);vi.restoreAllMocks();
});
