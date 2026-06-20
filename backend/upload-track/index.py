import os
import json
import base64
import uuid
import psycopg2
import boto3

def handler(event: dict, context) -> dict:
    """Загружает аудиофайл в S3 и сохраняет трек или стих в базу данных."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    title = body.get('title', '').strip()
    track_type = body.get('type', 'poem')
    text = body.get('text', '')
    file_data = body.get('file')
    file_name = body.get('fileName', 'track.mp3')

    if not title:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Название обязательно'})}

    schema = os.environ['MAIN_DB_SCHEMA']
    cdn_url = None
    file_key = None

    if track_type == 'music' and file_data:
        file_bytes = base64.b64decode(file_data)
        ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'mp3'
        file_key = f'tracks/{uuid.uuid4()}.{ext}'
        content_type = 'audio/mpeg' if ext == 'mp3' else f'audio/{ext}'

        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        s3.put_object(Bucket='files', Key=file_key, Body=file_bytes, ContentType=content_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"

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
