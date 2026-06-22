import os
import json
import uuid
import boto3
import psycopg2

def handler(event: dict, context) -> dict:
    """Создаёт presigned URL для прямой загрузки аудиофайла в S3, сохраняет запись трека в БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token'}, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Admin-Token') or headers.get('x-admin-token', '')
    if token != os.environ.get('ADMIN_PASSWORD', ''):
        return {'statusCode': 403, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Неверный пароль'})}

    body = json.loads(event.get('body') or '{}')
    title = body.get('title', '').strip()
    track_type = body.get('type', 'poem')
    text = body.get('text', '')
    file_name = body.get('fileName', 'track.mp3')

    if not title:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Название обязательно'})}

    schema = os.environ['MAIN_DB_SCHEMA']
    ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'mp3'
    file_key = f'tracks/{uuid.uuid4()}.{ext}'
    content_type = 'audio/mpeg' if ext == 'mp3' else f'audio/{ext}'
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    upload_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': 'files', 'Key': file_key},
        ExpiresIn=300
    )

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(
        f'INSERT INTO {schema}.tracks (title, type, text, file_key, cdn_url) VALUES (%s, %s, %s, %s, %s) RETURNING id',
        (title, track_type, text if track_type == 'poem' else None, file_key if track_type == 'music' else None, cdn_url if track_type == 'music' else None)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({
            'id': new_id,
            'title': title,
            'type': track_type,
            'text': text,
            'cdn_url': cdn_url,
            'upload_url': upload_url if track_type == 'music' else None,
            'content_type': content_type
        })
    }