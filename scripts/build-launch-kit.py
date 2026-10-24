#!/usr/bin/env python3
"""Build or verify the public kit from current drafts and captured artifacts."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public/launch'
SOURCES = {
    'README.md': ROOT / 'docs/launch/README.md',
    'product-hunt-submission.txt': ROOT / 'docs/launch/product-hunt-submission.txt',
    'linkedin-featured.txt': ROOT / 'docs/launch/linkedin-featured.txt',
    'walkthrough.json': ROOT / 'docs/launch/walkthrough.json',
    'product-hunt-gallery.json': ROOT / 'docs/launch/product-hunt-gallery.json',
}
GALLERY = json.loads((ROOT / 'docs/launch/product-hunt-gallery.json').read_text())
ASSETS = ['thumbnail.png', '01-home.png', '02-priorities.png', '03-signals.png', '04-brief.png', '05-decisions.png', '06-evidence-digest.png', '07-copyable-brief.png', '08-decision-review.png', '09-review-history.png', '10-mobile-review.png', 'decision-brief.md', 'tarazu-walkthrough.mp4', 'tarazu-walkthrough.vtt', 'capture.json']
SOURCES.update({name: PUBLIC / name for name in ASSETS})
SOURCES.update({item['file']: PUBLIC / item['file'] for item in GALLERY['images']})

def require(condition, message):
    if not condition:
        raise SystemExit(message)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify without rewriting assets')
    args = parser.parse_args()
    data = {name: source.read_bytes() for name, source in SOURCES.items()}
    chapters = json.loads(data['walkthrough.json'])
    seconds = chapters['secondsPerChapter']
    def timestamp(value):
        return f'{value // 60:02}:{value % 60:02}.000'
    cues = [f"{timestamp(i * seconds)} --> {timestamp((i + 1) * seconds)}\n" + '\n'.join(chapter['captions']) for i, chapter in enumerate(chapters['chapters'])]
    expected_vtt = 'WEBVTT\n\n' + '\n\n'.join(cues) + '\n'
    require(data['tarazu-walkthrough.vtt'].decode() == expected_vtt, 'Captions do not match the current walkthrough source; rebuild the video.')
    draft = data['product-hunt-submission.txt'].decode()
    for heading, limit in [('Tagline', 60), ('Description', 260)]:
        value = draft.split(f'\n{heading}\n')[1].split('\n\n')[0]
        require(0 < len(value) <= limit, f'{heading} exceeds {limit} characters')
    require('Make product decisions you can explain and revisit' in draft, 'Current positioning is missing')
    require('## Dated reviews' in data['decision-brief.md'].decode(), 'Copied brief is missing the demonstrated dated review')
    capture = json.loads(data['capture.json'])
    require(capture['aiUsed'] is False and capture['storage'] == 'Isolated guest browser', 'Capture must use the isolated, no-AI fictional scenario')
    for name, content in data.items():
        if name.endswith('.png'):
            require(content[:8] == b'\x89PNG\r\n\x1a\n', f'{name} is not PNG')
            size = struct.unpack('>II', content[16:24])
            expected = (GALLERY['width'], GALLERY['height']) if name.startswith('ph-') else (240, 240) if name == 'thumbnail.png' else (390, 844) if name == '10-mobile-review.png' else (1440, 960)
            require(size == expected, f'{name} has unexpected size {size}')
    manifest = {
        'captureRelease': capture['release'],
        'durationSeconds': seconds * len(chapters['chapters']),
        'files': {name: {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()} for name, content in sorted(data.items())},
    }
    manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
    data['manifest.json'] = manifest_bytes
    target = PUBLIC / 'tarazu-launch-kit.zip'
    if not args.check:
        (PUBLIC / 'manifest.json').write_bytes(manifest_bytes)
        with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name, content in sorted(data.items()):
                info = zipfile.ZipInfo(name, (2026, 10, 24, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, content)
    require((PUBLIC / 'manifest.json').read_bytes() == manifest_bytes, 'Public manifest is stale; rebuild the launch kit.')
    with zipfile.ZipFile(target) as archive:
        require(archive.testzip() is None, 'ZIP CRC validation failed')
        require(set(archive.namelist()) == set(data), 'ZIP file list differs from current launch assets')
        for name, content in data.items():
            require(archive.read(name) == content, f'ZIP contains stale content: {name}')
    print(f'PASS {len(data)} packaged files match current drafts/assets; captions {manifest["durationSeconds"]}s; capture {capture["release"]}.')

if __name__ == '__main__':
    main()
