import { beforeEach, it, expect, vi } from 'vitest';

const { db, revision, state } = vi.hoisted(() => ({ db: { from: vi.fn() }, revision: vi.fn().mockResolvedValue(2), state: {} }));
vi.mock('../../lib/api-auth', () => ({ withAuth: handler => handler('owner', db), verifyWorkspaceOwner: async () => true }));
vi.mock('../../lib/revisions', () => ({ createRevision: revision, resolveActor: async () => ({id:'owner'}) }));
import { GET as getContext, PUT as putContext } from './workspaces/[id]/context/route';
import { GET as getFeatures, POST as saveFeature } from './workspaces/[id]/features/route';
import { POST as revertFeature } from './workspaces/[id]/features/[featureId]/revert/route';

const id = '12345678-1234-1234-1234-123456789012';
const params = { params: Promise.resolve({id:'workspace', featureId:id}) };
const request = body => ({ json: async () => body });

beforeEach(() => {
  vi.clearAllMocks();
  state.feature = { id, name:'Reminders', description:'', reach:55, impact:55, confidence:20, effort:35, owner:null, theme:null, status:null, scoring_basis:{evidence:'Assumption only', reach:'30 accounts'} };
  state.context = { scoring_settings:{timeframe:'90 days', audience:'100 accounts', effortBands:{35:'Two to five days'}} };
  state.target = { snapshot_name:'Reminders', snapshot_description:'', snapshot_reach:55, snapshot_impact:55, snapshot_confidence:20, snapshot_effort:35, snapshot_scoring_basis:{reach:'Earlier hypothesis'} };
  state.writes = [];
  db.from.mockImplementation(table => {
    let operation = 'read';
    const result = () => ({data: table === 'workspaces' ? state.context : table === 'feature_revisions' ? state.target : [state.feature], error:null});
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain,
      limit: async () => ({data:[]}),
      single: async () => ({data: table === 'features' ? state.feature : result().data, error:null}),
      update: value => {operation='update'; state.writes.push({table,value}); return chain;},
      then: resolve => resolve(operation === 'read' ? result() : {error:null}),
    };
    return chain;
  });
});

it('round-trips shared settings and preserves them when a legacy client omits the field', async () => {
  expect(await (await getContext({},params)).json()).toMatchObject({scoring:state.context.scoring_settings});
  const scoring = {timeframe:'30 days', impactBands:{75:'10 percentage points'}};
  expect((await putContext(request({scoring}),params)).status).toBe(200);
  expect(state.writes[0].value.scoring_settings).toEqual(scoring);
  await putContext(request({productSummary:'Legacy client'}),params);
  expect(state.writes[1].value).not.toHaveProperty('scoring_settings');
});

it('returns candidate answers and saves answer-only changes in revision history', async () => {
  expect(await (await getFeatures({},params)).json()).toMatchObject({features:[{scoringBasis:state.feature.scoring_basis}]});
  const {scoring_basis, ...feature} = state.feature;
  const response = await saveFeature(request({...feature, scoringBasis:{reach:'60 accounts', effort:'Three person-days'}}),params);
  expect(response.status).toBe(200);
  expect(state.writes[0].value.scoring_basis).toEqual({reach:'60 accounts', effort:'Three person-days'});
  expect(revision).toHaveBeenCalledWith(db, expect.objectContaining({snapshot:expect.objectContaining({scoring_basis:{reach:'60 accounts', effort:'Three person-days'}}), changedFields:[expect.objectContaining({field:'scoring_basis'})]}));
});

it('does not generate duplicate revisions from JSON key order or erase answers on legacy saves', async () => {
  const {scoring_basis, ...feature} = state.feature;
  await saveFeature(request({...feature, scoringBasis:{reach:'30 accounts', evidence:'Assumption only'}}),params);
  expect(revision).not.toHaveBeenCalled();
  await saveFeature(request(feature),params);
  expect(state.writes.at(-1).value.scoring_basis).toEqual(scoring_basis);
  expect(revision).not.toHaveBeenCalled();
});

it('restores candidate answers with a revision and handles older snapshots', async () => {
  expect(await (await revertFeature(request({revision_number:1}),params)).json()).toMatchObject({scoringBasis:{reach:'Earlier hypothesis'}});
  expect(state.writes[0].value.scoring_basis).toEqual({reach:'Earlier hypothesis'});
  delete state.target.snapshot_scoring_basis;
  expect(await (await revertFeature(request({revision_number:1}),params)).json()).toMatchObject({scoringBasis:{}});
});

it('rejects malformed or oversized scoring writes before writing to the database', async () => {
  expect((await putContext(request({scoring:{effortBands:{35:10}}}),params)).status).toBe(400);
  expect((await saveFeature(request({name:'Bad',scoringBasis:{reach:'a'.repeat(1401)}}),params)).status).toBe(400);
  expect(state.writes).toEqual([]);
});

it('round-trips claim sources and preserves them when an older client only sends summary answers', async () => {
  const claim = {id:'c1', dimension:'impact', text:'Five-point improvement; forecast', kind:'estimate', origin:'user', sources:[{signalId:'s1',relation:'conflicts',quote:'Missing context caused delays'}]};
  const feature = {...state.feature, scoringBasis:{claims:[claim]}};
  await saveFeature(request(feature),params);
  expect(state.writes[0].value.scoring_basis.claims).toEqual([claim]);
  expect(revision.mock.calls[0][1].snapshot.scoring_basis.claims).toEqual([claim]);
  state.feature.scoring_basis = state.writes[0].value.scoring_basis;
  expect(await (await getFeatures({},params)).json()).toMatchObject({features:[{scoringBasis:{claims:[claim]}}]});
  await saveFeature(request({...feature, scoringBasis:{reach:'Legacy update'}}),params);
  expect(state.writes.at(-1).value.scoring_basis.claims).toEqual([claim]);
  await saveFeature(request({...feature, scoringBasis:{claims:[]}}),params);
  expect(state.writes.at(-1).value.scoring_basis.claims).toEqual([]);
  state.feature.scoring_basis = {claims:[]};
  state.target.snapshot_scoring_basis = {claims:[claim]};
  expect(await (await revertFeature(request({revision_number:1}),params)).json()).toMatchObject({scoringBasis:{claims:[claim]}});
});
