/* @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { Form } from './Form';
vi.mock('../ThemeProvider', () => ({ useC: () => ({}) }));
vi.mock('./Slider', () => ({ Slider: ({label,value}) => <div>{label} value {value}</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const candidate = { id:'a', name:'Search', reach:23, impact:34, confidence:45, effort:56 };
const result = score => ({ reach: { score, justification: 'reason', evidence:[], assumptions:[], gaps:['audience'], nextAction:'Interview users' } });
it('preserves manual values until explicit acceptance and leaves unknowns unchanged', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>result(70)}));
  render(<Form editFeature={candidate} onAdd={()=>{}} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('AI suggests 70/100');
  expect(screen.getByText('Reach value 23')).toBeTruthy();
  fireEvent.click(screen.getByText('Accept reach suggestion'));
  expect(screen.getByText('Reach value 70')).toBeTruthy();
  fetch.mockResolvedValue({ok:true,json:async()=>result(null)});
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('AI needs more information');
  expect(screen.getByText('Reach value 70')).toBeTruthy();
});
it('marks suggestions stale after brief edits and blocks acceptance', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>result(70)}));
  const {rerender} = render(<Form editFeature={candidate} onAdd={()=>{}} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('Accept reach suggestion');
  rerender(<Form editFeature={candidate} productContext={{constraints:'No capacity'}} onAdd={()=>{}} />);
  expect(screen.getByText('Accept reach suggestion').disabled).toBe(true);
});
it('ignores a late response after candidate text changes', async () => {
  let resolve;
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(r => {resolve=r;})));
  render(<Form editFeature={candidate} onAdd={()=>{}} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  fireEvent.change(screen.getByLabelText('Candidate name'), {target:{value:'Changed'}});
  resolve({ok:true,json:async()=>result(90)});
  await waitFor(() => expect(screen.getByText('✦ AI Suggest Scores').disabled).toBe(false));
  expect(screen.queryByText('Accept reach suggestion')).toBeNull();
  expect(screen.getByText('Reach value 23')).toBeTruthy();
});
it('preserves manual scores on failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unavailable')));
  render(<Form editFeature={candidate} onAdd={()=>{}} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('Unavailable');
  expect(screen.getByText('Reach value 23')).toBeTruthy();
});

it('restores candidate answers, sends edits to AI, and saves them with manual scores', async () => {
  const save = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>result(55)}));
  render(<Form editFeature={{...candidate, scoringBasis: {reach:'30 of 100 accounts'}}} onAdd={save} productContext={{scoring:{timeframe:'90 days'}}} />);
  expect(screen.getByLabelText('Who will this reach?').value).toBe('30 of 100 accounts');
  fireEvent.change(screen.getByLabelText('What will it take to deliver?'), {target:{value:'Production pilot; 3 total person-days'}});
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('Accept reach suggestion');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({scoringBasis:{reach:'30 of 100 accounts', effort:'Production pilot; 3 total person-days'}, productContext:{scoring:{timeframe:'90 days'}}});
  fireEvent.click(screen.getByText('Save Changes'));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({reach:23, scoringBasis:expect.objectContaining({effort:'Production pilot; 3 total person-days'})}));
});

it('blocks accepting estimates after candidate answers or shared anchors change', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>result(55)}));
  const props = {editFeature:candidate, onAdd:()=>{}, productContext:{scoring:{timeframe:'90 days'}}};
  const {rerender} = render(<Form {...props} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('Accept reach suggestion');
  fireEvent.change(screen.getByLabelText('Who will this reach?'), {target:{value:'Different segment'}});
  expect(screen.getByText('Accept reach suggestion').disabled).toBe(true);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await waitFor(()=>expect(screen.getByText('Accept reach suggestion').disabled).toBe(false));
  rerender(<Form {...props} productContext={{scoring:{timeframe:'90 days', effortBands:{35:'Up to five days'}}}} />);
  expect(screen.getByText('Accept reach suggestion').disabled).toBe(true);
});

it('saves individually labeled claims, conflicting sources and checked excerpts', async () => {
  const save = vi.fn();
  render(<Form editFeature={candidate} onAdd={save} workspaceId="w" signals={[{id:'s1',workspace_id:'w',title:'Research note',body:'Missing context delays approval'}, {id:'foreign',workspace_id:'other',title:'Private other workspace'}]} />);
  fireEvent.click(screen.getByText('Add scoring claim'));
  fireEvent.change(screen.getByLabelText('Claim 1'), {target:{value:'Reminders reduce overdue approvals by five points; forecast'}});
  fireEvent.change(screen.getByLabelText('Scoring input for claim 1'), {target:{value:'impact'}});
  fireEvent.change(screen.getByLabelText('Claim type for claim 1'), {target:{value:'estimate'}});
  expect(screen.queryByText('Private other workspace')).toBeNull();
  fireEvent.change(screen.getByLabelText('Evidence for claim 1'), {target:{value:'s1'}});
  fireEvent.change(screen.getByLabelText('Source relationship 1 for claim 1'), {target:{value:'conflicts'}});
  fireEvent.change(screen.getByLabelText('Excerpt 1 for claim 1'), {target:{value:'An invented quote'}});
  expect(screen.getByText(/Excerpt not found in source/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Excerpt 1 for claim 1'), {target:{value:'Missing context delays approval'}});
  expect(screen.getByText(/Excerpt matches source/)).toBeTruthy();
  fireEvent.click(screen.getByText('Save Changes'));
  expect(save.mock.calls[0][0].scoringBasis.claims[0]).toMatchObject({dimension:'impact',kind:'estimate',sources:[{signalId:'s1',relation:'conflicts',quote:'Missing context delays approval'}]});
});

it('adds a sourced follow-up answer, blocks stale acceptance, and sends it on rerun', async () => {
  const reply = {reach:{...result(35).reach, followUp:{question:'How many accounts are eligible in the first 30 days?',whyItChangesScore:'The audience share changes the reach band.',claimIds:[]}}};
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>reply}));
  render(<Form editFeature={candidate} onAdd={()=>{}} signals={[{id:'s1',title:'Analytics',body:'Thirty accounts eligible'}]} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText(reply.reach.followUp.question);
  fireEvent.change(screen.getByLabelText('Answer reach follow-up'), {target:{value:'30 of 100 accounts, first 30 days, current analytics'}});
  fireEvent.change(screen.getByLabelText('Claim type for reach answer'), {target:{value:'fact'}});
  fireEvent.change(screen.getByLabelText('Evidence for reach answer'), {target:{value:'s1'}});
  fireEvent.click(screen.getByText('Add answer to draft'));
  expect(screen.getByText('Accept reach suggestion').disabled).toBe(true);
  expect(screen.getAllByText(/Answer recorded; source still needs review/).length).toBeGreaterThan(0);
  expect(screen.getByText('Reach value 23')).toBeTruthy();
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await waitFor(()=>expect(screen.getByText('Accept reach suggestion').disabled).toBe(false));
  const body = JSON.parse(fetch.mock.calls[1][1].body);
  expect(body.scoringBasis.claims[0]).toMatchObject({kind:'fact',question:reply.reach.followUp.question,sources:[{signalId:'s1'}]});
});

it('only adopts AI assumptions explicitly, retains their origin and invalidates old suggestions', async () => {
  const save = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>({reach:{...result(35).reach,assumptions:['Adoption is untested']}})}));
  render(<Form editFeature={candidate} onAdd={save} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('Add as AI assumption');
  fireEvent.click(screen.getByText('Save Changes'));
  expect(save.mock.calls[0][0].scoringBasis.claims).toEqual([]);
  fireEvent.click(screen.getByText('Add as AI assumption'));
  expect(screen.getByText('Accept reach suggestion').disabled).toBe(true);
  await waitFor(() => expect(screen.getByText('Save Changes').disabled).toBe(false));
  fireEvent.click(screen.getByText('Save Changes'));
  expect(save.mock.calls[1][0].scoringBasis.claims[0]).toMatchObject({text:'Adoption is untested',kind:'ai_assumption',origin:'ai'});
});


it('waits for durable save, keeps edits on rejection, and distinguishes browser from cloud success', async () => {
  let resolve;
  const save = vi.fn().mockRejectedValueOnce(new Error('Cloud save unavailable')).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  render(<Form editFeature={candidate} onAdd={save} saveTarget="cloud" />);
  expect(screen.getByText('Saved to cloud')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Candidate name'), {target:{value:'Edited Search'}});
  expect(screen.getByText('Unsaved changes')).toBeTruthy();
  fireEvent.click(screen.getByText('Save Changes'));
  await screen.findByText('Cloud save unavailable');
  expect(screen.getByLabelText('Candidate name').value).toBe('Edited Search');
  expect(screen.getByText('Unsaved changes')).toBeTruthy();
  fireEvent.click(screen.getByText('Save Changes'));
  expect(screen.getAllByText('Saving…').length).toBeGreaterThan(0);
  expect(screen.getByLabelText('Candidate name').closest('fieldset').disabled).toBe(true);
  expect(screen.queryByText('Saved to cloud')).toBeNull();
  resolve({savedTo:'browser',pendingSync:true});
  await screen.findByText('Saved in this browser · pending sync');
  expect(screen.getByText('Save Changes').disabled).toBe(false);
});

it('makes accepting an equal-value AI suggestion explicit and dirty until saved', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>result(23)}));
  render(<Form editFeature={candidate} onAdd={async()=>({savedTo:'cloud'})} saveTarget="cloud" />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('AI suggests 23/100');
  expect(screen.getByText('Saved to cloud')).toBeTruthy();
  fireEvent.click(screen.getByText('Accept reach suggestion'));
  expect(screen.getByText('AI 23/100 · accepted in draft')).toBeTruthy();
  expect(screen.getByText('Unsaved changes')).toBeTruthy();
  fireEvent.click(screen.getByText('Save Changes'));
  await screen.findByText('Saved to cloud');
});

it('recognizes an estimated answer on a refreshed AI response without reopening the answer editor', async () => {
  const question = 'How many accounts are eligible?';
  const followUp = {question,whyItChangesScore:'Changes the audience share.',claimIds:[]};
  const claim = {id:'answer',dimension:'reach',text:'Thirty accounts, forecast',kind:'estimate',origin:'user',question,sources:[]};
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>({reach:{...result(35).reach,followUp}})}));
  render(<Form editFeature={{...candidate,scoringBasis:{claims:[claim]}}} onAdd={()=>{}} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('AI suggests 35/100');
  expect(screen.getAllByText(/Answer recorded; measured evidence still needed/).length).toBeGreaterThan(0);
  expect(screen.queryByLabelText('Answer reach follow-up')).toBeNull();
});


it('starts with four readable score controls and keeps supporting detail collapsed', () => {
  const {container} = render(<Form editFeature={{...candidate,scoringBasis:{claims:[{id:'long',dimension:'reach',kind:'estimate',text:'An audience estimate '.repeat(30),origin:'user',sources:[]}]}}} onAdd={()=>{}} productContext={{constraints:'One engineer'}} onProductContextChange={()=>{}} />);
  expect(screen.getAllByRole('region',{name:/ score$/}).length).toBe(4);
  expect(screen.getByText('STRATEGY BRIEF').closest('button').getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByLabelText('CONSTRAINTS')).toBeNull();
  const claimSummary = container.querySelector('section[aria-label="Scoring claims and sources"] details summary');
  expect(claimSummary.textContent.length).toBeLessThan(160);
  expect(claimSummary.closest('details').open).toBe(false);
  expect(screen.getByText('Background answers').closest('details').open).toBe(false);
});


it('resolves accepted score events with final saved values even after refreshing AI', async () => {
  const resolveScores = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,json:async()=>result(35)}));
  render(<Form editFeature={candidate} onAdd={async()=>({savedTo:'cloud'})} onResolveScores={resolveScores} />);
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('Accept reach suggestion');
  fireEvent.click(screen.getByText('Accept reach suggestion'));
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('Accept reach suggestion');
  fireEvent.click(screen.getByText('Save Changes'));
  await waitFor(() => expect(resolveScores).toHaveBeenCalledWith('a', {reach:35,impact:34,confidence:45,effort:56}));
});


it('shows an existing locally saved candidate as pending cloud sync when reopened', () => {
  render(<Form editFeature={candidate} onAdd={()=>{}} saveTarget="browser" savePendingSync />);
  expect(screen.getByText('Saved in this browser · pending sync')).toBeTruthy();
  expect(screen.queryByText('Saved to cloud')).toBeNull();
});
