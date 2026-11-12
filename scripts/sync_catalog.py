"""Fetch the public assistant export, validate, and update only catalogue posts."""
from datetime import date, datetime, timezone
import json
import os
from pathlib import Path
import re
from urllib.request import urlopen

FEED_URL = 'https://invigorating-grace-production-187d.up.railway.app/library/catalog.json'
FIELDS = {'id','date','title','summary','summaryKind','text','terms','topics','url'}


def validate(payload, current):
    if set(payload) != {'version','channel','since','posts','updatedAt'}:
        raise ValueError('Unexpected export fields')
    if payload['version'] != 1 or payload['channel'] != 'notdandeliongirl' or payload['since'] != '2023-09-13':
        raise ValueError('Unexpected export identity')
    datetime.fromisoformat(payload['updatedAt'])
    if not isinstance(payload['posts'],list) or len(payload['posts']) < max(1, len(current['posts'])*.8):
        raise ValueError('Unexpected catalogue shrinkage; manual review required')
    term_ids = {t['id'] for t in current['terms']}
    topic_ids = {t['id'] for t in current['topics']}
    seen = set()
    for p in payload['posts']:
        if set(p) != FIELDS or type(p['id']) is not int or p['id'] <= 0 or p['id'] in seen:
            raise ValueError('Invalid post identity or fields')
        seen.add(p['id'])
        if p['url'] != f"https://t.me/notdandeliongirl/{p['id']}":
            raise ValueError('Invalid Telegram source')
        if date.fromisoformat(p['date']) < date(2023,9,13) or p['summaryKind'] not in {'summary','excerpt'}:
            raise ValueError('Invalid date or description type')
        for field in ('title','summary','text'):
            if not isinstance(p[field],str) or not p[field].strip() or len(p[field]) > 100000:
                raise ValueError('Invalid public text')
        if not isinstance(p['terms'],list) or not isinstance(p['topics'],list) or not set(p['terms']) <= term_ids or not set(p['topics']) <= topic_ids:
            raise ValueError('Unknown public taxonomy')
        compact=re.sub(r'[\s_#-]+','',p['text'].lower())
        if 'парусловвмикрофон' in compact or re.search(r'дайджест|#кейс\b|#квиз\b|разбор тренаж[её]ра',p['text'],re.I):
            raise ValueError('Excluded material in export')
    return payload['posts']


def main():
    path = Path('catalog.js')
    current = json.loads(path.read_text(encoding='utf-8').removeprefix('window.CATALOG = ').rstrip(';\n'))
    with urlopen(FEED_URL,timeout=45) as response:
        if response.geturl() != FEED_URL:
            raise ValueError('Unexpected export redirect')
        raw = response.read(5_000_001)
    if len(raw) > 5_000_000:
        raise ValueError('Public export exceeds limit')
    payload = json.loads(raw)
    posts = validate(payload,current)
    changed = posts != current['posts']
    if changed:
        current['posts'] = posts
        current['updatedAt'] = datetime.now(timezone.utc).isoformat()
        text=json.dumps(current,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
        temporary=path.with_suffix('.tmp')
        temporary.write_text('window.CATALOG = '+text+';\n',encoding='utf-8')
        temporary.replace(path)
    if os.getenv('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a',encoding='utf-8') as output:
            output.write('changed='+str(changed).lower()+'\n')
    print(json.dumps({'posts':len(posts),'changed':changed}))


if __name__ == '__main__':
    main()
