import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const dir='public/launch';
const {secondsPerChapter,chapters}=JSON.parse(fs.readFileSync('docs/launch/walkthrough.json','utf8'));
if(!Number.isInteger(secondsPerChapter)||secondsPerChapter<1||!chapters.length)throw new Error('Invalid walkthrough timing');
const timestamp=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}.000`;
const cues=chapters.map((chapter,index)=>{
 if(!fs.existsSync(`${dir}/video-${index+1}.png`)||!Array.isArray(chapter.captions)||chapter.captions.length!==2)throw new Error(`Missing frame or captions for chapter ${index+1}`);
 return `${timestamp(index*secondsPerChapter)} --> ${timestamp((index+1)*secondsPerChapter)}\n${chapter.captions.join('\n')}`;
});
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate',`1/${secondsPerChapter}`,'-start_number','1','-i',`${dir}/video-%d.png`,'-vf','fps=24','-t',String(secondsPerChapter*chapters.length),'-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',`${dir}/tarazu-walkthrough.mp4`],{stdio:'inherit'});
fs.writeFileSync(`${dir}/tarazu-walkthrough.vtt`,`WEBVTT\n\n${cues.join('\n\n')}\n`);
console.log(`Built ${secondsPerChapter*chapters.length}-second walkthrough from ${chapters.length} actual-app still captures. No live AI is depicted.`);
