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
  await screen.findByText('reach: Suggested 70/100');
  expect(screen.getByText('Reach value 23')).toBeTruthy();
  fireEvent.click(screen.getByText('Accept reach suggestion'));
  expect(screen.getByText('Reach value 70')).toBeTruthy();
  fetch.mockResolvedValue({ok:true,json:async()=>result(null)});
  fireEvent.click(screen.getByText('✦ AI Suggest Scores'));
  await screen.findByText('reach: Insufficient information');
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
