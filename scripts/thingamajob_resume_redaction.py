"""Local text derivative only. Never edits DOCX or calls a model/network service."""
import hashlib
import io
import json
from pathlib import Path
import re
import uuid
from datetime import datetime, timezone
import zipfile
import xml.etree.ElementTree as ET

BASELINE = 'b3359519-cebd-4407-a432-e99b357d2716'
BASELINE_HASH = '558267773bb53dcb595abcbd1c48242e249ad1561d79df85353536e136231e9e'
ORIGINAL_RUN = '4fff8dd5-0e07-4a8b-8c54-286b69c34c0b'
ORIGINAL_MANIFEST_HASH = '70b4605927260052297611b40442ce0703b60b0d80829b91f6c127f3bdbc68e2'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
PHONE = re.compile(r'(?<!\w)(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}(?!\d)')
EMAIL = re.compile(r'[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+')
NAME = re.compile(r'\b(?:D\.\s*)?James\s+Poer\b', re.I)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def paragraphs(data):
    result = []
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for part in sorted(archive.namelist()):
            if not re.fullmatch(r'word/(document|header\d+|footer\d+|footnotes|endnotes)\.xml', part):
                continue
            raw = archive.read(part)
            if b'<!DOCTYPE' in raw or b'<!ENTITY' in raw:
                raise ValueError('Unsafe XML')
            root = ET.fromstring(raw)
            relationships = {}
            relationship_part = str(Path(part).parent / '_rels' / (Path(part).name + '.rels')).replace('\\', '/')
            if relationship_part in archive.namelist():
                relationships = {r.attrib.get('Id'): r.attrib.get('Target', '')
                                 for r in ET.fromstring(archive.read(relationship_part))
                                 if r.attrib.get('TargetMode') == 'External'}
            if root.findall('.//w:del', NS) or root.findall('.//w:ins', NS) or root.findall('.//w:txbxContent', NS):
                raise ValueError('Unsupported document structure requires review')
            for index, paragraph in enumerate(root.findall('.//w:p', NS), 1):
                text = ''
                for node in paragraph.iter():
                    if node.tag == '{%s}t' % NS['w']:
                        text += node.text or ''
                    elif node.tag == '{%s}tab' % NS['w']:
                        text += '\t'
                    elif node.tag in ('{%s}br' % NS['w'], '{%s}cr' % NS['w']):
                        text += '\n'
                links = [relationships.get(link.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'), '')
                         for link in paragraph.findall('.//w:hyperlink', NS)]
                # Preserve actual career web references; Word's about: placeholders are not sources.
                links = [link for link in links if re.match(r'^https?://', link, re.I)]
                result.append({'part': part, 'paragraph': index, 'text': text, 'careerLinks': links})
    return result


def redact(records):
    body = {r['paragraph']: r['text'] for r in records if r['part'] == 'word/document.xml'}
    # Narrow reviewed header positions, not a broad address regex that could erase career prose.
    checks = [NAME.fullmatch(body.get(1, '').strip()),
              re.match(r'^\s*\d+', body.get(3, '')),
              body.get(4) == 'Contact Information',
              PHONE.fullmatch(body.get(5, '').strip()),
              EMAIL.fullmatch(body.get(6, '').strip()),
              body.get(7, '').strip().startswith('linkedin.com/in/')]
    if not all(checks):
        raise ValueError('Contact header differs from inspected source; stop for review')
    classes = {1: 'personal-name', 3: 'home-address', 4: 'contact-label',
               5: 'personal-phone', 6: 'personal-email', 7: 'personal-profile-url'}
    changes, derived = [], []
    for record in records:
        text = record['text']
        category = classes.get(record['paragraph']) if record['part'] == 'word/document.xml' else None
        if category:
            replacement = '[REDACTED: %s]' % category
        else:
            replacement = NAME.sub('[REDACTED: personal-name]', text)
            if replacement != text:
                category = 'personal-name'
        if replacement != text:
            changes.append({'part': record['part'], 'paragraph': record['paragraph'], 'class': category})
        output = {**record, 'text': replacement}
        if category and 'careerLinks' in output:
            output['careerLinks'] = []
        derived.append(output)
    joined = '\n'.join(r['text'] + '\n' + '\n'.join(r.get('careerLinks', [])) for r in derived)
    # Exact removed values must be absent everywhere, including headers/footers.
    for index in (1, 3, 5, 6, 7):
        if body[index].strip().lower() in joined.lower():
            raise ValueError('Removed identifier persists')
    if EMAIL.search(joined) or PHONE.search(joined):
        raise ValueError('Additional contact identifier requires review')
    changed_locations = {(r['part'], r['paragraph']) for r in changes}
    unchanged = 0
    for original, output in zip(records, derived, strict=True):
        if (original['part'], original['paragraph']) not in changed_locations:
            if original != output:
                raise ValueError('Career paragraph changed')
            unchanged += 1
    return derived, changes, unchanged


def main():
    repo = Path(__file__).resolve().parent.parent
    root = repo / 'career-source/proof-runs'
    originals = root / ORIGINAL_RUN
    baseline = root / BASELINE
    for directory, expected in ((originals, ORIGINAL_MANIFEST_HASH), (baseline, BASELINE_HASH)):
        if digest((directory / 'manifest.json').read_bytes()) != expected or (directory / 'COMMITTED.sha256').read_text().strip() != expected:
            raise ValueError('Sealed manifest integrity failure')
    original_manifest = json.loads((originals / 'manifest.json').read_bytes())
    source = next(s for s in original_manifest['sources'] if s['file'] == 'resume.docx')
    original = (originals / 'resume.docx').read_bytes()
    if digest(original) != source['sha256'] or (baseline / 'resume.docx').read_bytes() != original:
        raise ValueError('Original/baseline resume integrity failure')
    records = paragraphs(original)
    derived, changes, unchanged = redact(records)
    artifact = ('\n\n'.join('[%s paragraph %d]\n%s%s' % (r['part'], r['paragraph'], r['text'],
                '\n[Source hyperlinks]\n' + '\n'.join(r['careerLinks']) if r.get('careerLinks') else '') for r in derived) + '\n').encode('utf-8')
    derivative_id = str(uuid.uuid4())
    directory = root / ('redacted-' + derivative_id)
    directory.mkdir()
    with (directory / 'resume.redacted.txt').open('xb') as stream:
        stream.write(artifact)
    manifest = {'formatVersion': 1, 'derivativeId': derivative_id, 'baselineRunId': BASELINE,
                'baselineManifestSha256': BASELINE_HASH, 'originalManifestSha256': ORIGINAL_MANIFEST_HASH,
                'originalSource': source, 'redactedAt': datetime.now(timezone.utc).isoformat(),
                'stage': 'redacted-only-before-extraction', 'redactionOccurred': True,
                'method': 'Deterministic OOXML text projection; reviewed contact header and personal-name removal',
                'removedClasses': sorted({r['class'] for r in changes}), 'redactions': changes,
                'unchangedParagraphs': unchanged, 'totalParagraphs': len(records),
                'preservedCareerHyperlinks': sum(len(r.get('careerLinks', [])) for r in derived),
                'artifact': {'file': 'resume.redacted.txt', 'sha256': digest(artifact), 'byteLength': len(artifact)},
                'projection': 'OOXML text/tab/line-break values and career HTTP(S) hyperlink targets in part/paragraph order; formatting, package metadata and about: placeholders excluded; not a DOCX replacement'}
    manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
    with (directory / 'manifest.json').open('xb') as stream:
        stream.write(manifest_bytes)
    if (originals / 'resume.docx').read_bytes() != original or (baseline / 'resume.docx').read_bytes() != original or digest((directory / 'resume.redacted.txt').read_bytes()) != digest(artifact):
        raise ValueError('Post-write integrity failure')
    with (directory / 'COMMITTED.sha256').open('x') as stream:
        stream.write(digest(manifest_bytes) + '\n')
    print(json.dumps({'directory': str(directory), 'derivativeId': derivative_id,
                      'manifestSha256': digest(manifest_bytes), 'artifact': manifest['artifact'],
                      'removedClasses': manifest['removedClasses'], 'redactionCount': len(changes),
                      'unchangedParagraphs': unchanged, 'totalParagraphs': len(records)}, indent=2))


if __name__ == '__main__':
    main()
