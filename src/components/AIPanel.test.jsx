import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIPanel } from './AIPanel';
import { AuthContext } from '../hooks/useAuth';

const scored = [
  {id:'a',name:'Reminders',score:8400,reach:75,impact:70,confidence:40,effort:25},
  {id:'b',name:'Readiness checklist',score:3900,reach:60,impact:65,confidence:30,effort:30},
];
const analysis = {
  summary:'Test before building.',
  topPick:{name:'Readiness checklist',reason:'Test the missing-context hypothesis.',confidence:'low'},
  quickWin:{name:'Reminders',reason:'Existing service can be reused.',confidence:'low'},
  riskFlag:{name:'Reminders',reason:'The cause is uncertain.',confidence:'low'},
  sprintPlan:['Readiness checklist','Reminders'],insight:'Classify real overdue requests.',
};
const response = (data, status=200) => ({ok:status===200,status,json:async()=>data});
beforeEach(()=>vi.stubGlobal('fetch',vi.fn()));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const generate = () => fireEvent.click(screen.getByRole('button',{name:'Generate Recommendation'}));

it('shows the actual API failure and retry without a replacement recommendation', async()=>{
  fetch.mockResolvedValue(response({error:'The AI returned a malformed response.',category:'invalid_response'},502));
  const onAnalysisEvent = vi.fn().mockResolvedValue('event');
  const onSaveDecisionDraft = vi.fn();
  render(<AIPanel scored={scored} onAnalysisEvent={onAnalysisEvent} onSaveDecisionDraft={onSaveDecisionDraft}/>);
  generate();
  expect(await screen.findByText('The AI returned a malformed response.')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Retry'})).toBeTruthy();
  expect(screen.queryByText(/DEMO MODE|Configure API|Highest RICE score/)).toBeNull();
  expect(screen.queryByRole('button',{name:/Save as Decision/})).toBeNull();
  expect(onSaveDecisionDraft).not.toHaveBeenCalled();
  await waitFor(()=>expect(onAnalysisEvent).toHaveBeenCalledWith(expect.objectContaining({mode:'live',error:true})));
});

it('recovers from a visible failure with one click and records only a live result', async()=>{
  fetch.mockResolvedValueOnce(response({error:'Service unavailable'},502)).mockResolvedValueOnce(response(analysis));
  render(<AIPanel scored={scored}/>);
  generate();
  fireEvent.click(await screen.findByRole('button',{name:'Retry'}));
  expect(await screen.findByText('Test before building.')).toBeTruthy();
  expect(screen.queryByText('Service unavailable')).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(scored[0].confidence).toBe(40);
});

it('keeps a valid live result when feedback logging rejects', async()=>{
  fetch.mockResolvedValueOnce(response(analysis));
  const onAnalysisEvent = vi.fn().mockRejectedValue(new Error('telemetry unavailable'));
  render(<AIPanel scored={scored} onAnalysisEvent={onAnalysisEvent}/>);
  generate();
  expect(await screen.findByText('Test before building.')).toBeTruthy();
  await waitFor(()=>expect(onAnalysisEvent).toHaveBeenCalled());
  expect(screen.queryByText(/DEMO MODE|telemetry unavailable/)).toBeNull();
  expect(screen.getByText('Live')).toBeTruthy();
});

it('shows a valid result before feedback logging has completed', async()=>{
  fetch.mockResolvedValueOnce(response(analysis));
  render(<AIPanel scored={scored} onAnalysisEvent={()=>new Promise(()=>{})}/>);
  generate();
  expect(await screen.findByText('Test before building.')).toBeTruthy();
  expect(screen.queryByText('Generating recommendation...')).toBeNull();
});

it('regenerates with one click instead of clearing the panel for a second click', async()=>{
  fetch.mockResolvedValueOnce(response(analysis)).mockResolvedValueOnce(response({...analysis,summary:'Updated recommendation.'}));
  render(<AIPanel scored={scored}/>);
  generate();
  fireEvent.click(await screen.findByRole('button',{name:'↻ Regenerate'}));
  expect(await screen.findByText('Updated recommendation.')).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('keeps sign-in failures separate from service failures', async()=>{
  fetch.mockResolvedValueOnce(response({error:'Sign in'},401));
  render(<AIPanel scored={scored}/>);
  generate();
  expect(await screen.findByRole('link',{name:'Sign in'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Retry'})).toBeNull();
});

it('handles an unreachable service without fabricating recommendations', async()=>{
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  render(<AIPanel scored={scored}/>);
  generate();
  expect(await screen.findByText('Could not reach the advisor. Please try again.')).toBeTruthy();
  expect(screen.queryByText('Live')).toBeNull();
});

it('discards a response for context that changed while the request was running', async()=>{
  let complete;
  fetch.mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve;}));
  const {rerender} = render(<AIPanel scored={scored} productContext={{targetUsers:'Administrators'}}/>);
  generate();
  rerender(<AIPanel scored={scored} productContext={{targetUsers:'Solo requesters'}}/>);
  complete(response(analysis));
  await waitFor(()=>expect(screen.queryByText('Generating recommendation...')).toBeNull());
  expect(screen.queryByText('Test before building.')).toBeNull();
  expect(screen.getByRole('button',{name:'Generate Recommendation'})).toBeTruthy();
});

it('replaces a failed regeneration with an error instead of leaving a saveable old result', async()=>{
  fetch.mockResolvedValueOnce(response(analysis)).mockResolvedValueOnce(response({error:'Response validation failed'},502));
  render(<AIPanel scored={scored} onSaveDecisionDraft={vi.fn()}/>);
  generate();
  fireEvent.click(await screen.findByRole('button',{name:'↻ Regenerate'}));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Test before building.')).toBeNull();
  expect(screen.queryByRole('button',{name:/Save as Decision/})).toBeNull();
});

it('offers the own-workspace path without making AI requests from the public demo', () => {
  render(<AuthContext.Provider value={{isGuestDemo:true}}><AIPanel scored={scored}/></AuthContext.Provider>);
  expect(screen.queryByRole('button',{name:'Generate Recommendation'})).toBeNull();
  expect(screen.getByRole('link',{name:'Open your workspace'}).getAttribute('href')).toBe('/app');
  expect(fetch).not.toHaveBeenCalled();
});
