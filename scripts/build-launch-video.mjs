import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const dir='public/launch';
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','1/12','-start_number','1','-i',`${dir}/video-%d.png`,'-vf','fps=24','-t','60','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',`${dir}/tarazu-walkthrough.mp4`],{stdio:'inherit'});
fs.writeFileSync(`${dir}/tarazu-walkthrough.vtt`, `WEBVTT

00:00.000 --> 00:12.000
Tarazu keeps the evidence and reasoning behind product decisions.
Explore a complete fictional example without an account.

00:12.000 --> 00:24.000
Compare the next learning step using shared scoring bands and recorded assumptions.
These are relative indices, not measured return.

00:24.000 --> 00:36.000
Inspect supporting and conflicting evidence.
All Relay users, interviews and case reviews are synthetic.

00:36.000 --> 00:48.000
Reopen a saved validation brief with its open questions and proposed next test.
A partial assessment does not establish customer validation.

00:48.000 --> 01:00.000
Keep the reasoning and originating brief revision in a decision draft.
Try tarazu.app/demo. Live AI runs separately after sign-in and human review.
`);
console.log('Built 60-second captioned still-capture walkthrough; no live AI is depicted.');
