import os
import json
import base64
import uuid
import psycopg2
import boto3
from email import message_from_bytes
from email.policy import HTTP

def parse_multipart(event):
    """Парсит multipart/form-data из event."""
    content_type = ''
    for k, v in (event.get('headers') or {}).items():
        if k.lower() == 'content-type':
            content_type = v
            break

    body_raw = event.get('body') or ''
    if event.get('isBase64Encoded'):
        body_bytes = base64.b64decode(body_raw)
    else:
        body_bytes = body_raw.encode('latin-1')

    # Парсим через email модуль
    raw = f'Content-Type: {content_type}\r\n\r\n'.encode() + body_bytes
    msg = message_from_bytes(raw, policy=HTTP)

    fields = {}
    file_data = None
    file_name = 'track.mp3'

    for part in msg.iter_parts():
        cd = part.get('Content-Disposition', '')
        name = None
        fname = None
        for item in cd.split(';'):
            item = item.strip()
            if item.startswith('name='):
                name = item[5:].strip('"')
            elif item.startswith('filename='):
                fname = item[9:].strip('"')

        if name == 'file' and fname:
            file_data = part.get_payload(decode=True)
            file_name = fname
        elif name:
            fields[name] = part.get_payload(decode=True).decode('utf-8', errors='replace')

    return fields, file_data, file_name

def handler(event: dict, context) -> dict:
    """Принимает multipart/form-data с аудиофайлом, загружает в S3 и сохраняет трек в БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }

    content_type = ''
    for k, v in (event.get('headers') or {}).items():
        if k.lower() == 'content-type':
            content_type = v
            break

    schema = os.environ['MAIN_DB_SCHEMA']
    cdn_url = None
    file_key = None
    title = ''
    track_type = 'poem'
    text = ''

    if 'multipart/form-data' in content_type:
        fields, file_data, file_name = parse_multipart(event)
        title = fields.get('title', '').strip()
        track_type = fields.get('type', 'poem')
        text = fields.get('text', '')

        if track_type == 'music' and file_data:
            ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'mp3'
            file_key = f'tracks/{uuid.uuid4()}.{ext}'
            content_type_audio = 'audio/mpeg' if ext == 'mp3' else f'audio/{ext}'

            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
            )
            s3.put_object(Bucket='files', Key=file_key, Body=file_data, ContentType=content_type_audio)
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"
    else:
        # JSON fallback для стихов
        body = json.loads(event.get('body') or '{}')
        title = body.get('title', '').strip()
        track_type = body.get('type', 'poem')
        text = body.get('text', '')

    if not title:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Название обязательно'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(
        f'INSERT INTO {schema}.tracks (title, type, text, file_key, cdn_url) VALUES (%s, %s, %s, %s, %s) RETURNING id',
        (title, track_type, text if track_type == 'poem' else None, file_key, cdn_url)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'id': new_id, 'title': title, 'type': track_type, 'text': text, 'url': cdn_url})
    }
