import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const dir='public/launch';
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','1/12','-start_number','1','-i',`${dir}/video-%d.png`,'-vf','fps=24','-t','60','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',`${dir}/tarazu-walkthrough.mp4`],{stdio:'inherit'});
fs.writeFileSync(`${dir}/tarazu-walkthrough.vtt`, `WEBVTT

00:00.000 --> 00:12.000
One engineer, two weeks: what should the fictional Relay team test?
Follow a short read-only story without an account.

00:12.000 --> 00:24.000
Administrator notes support reminders; missing documents challenge that explanation.
All Relay interviews and case reviews are synthetic.

00:24.000 --> 00:36.000
The second draft proposes testing request readiness before a reminder build.
This is a judgment with uncertainty, not an approved build.

00:36.000 --> 00:48.000
Compare a paper checklist with the current workflow for hypothetical requesters.
The example contains no completed test or measured outcome.

00:48.000 --> 01:00.000
Reopen problem, evidence, decision and next test from the preserved brief revision.
Try tarazu.app/demo. Live AI runs separately after sign-in and human review.
`);
console.log('Built 60-second captioned still-capture walkthrough; no live AI is depicted.');
