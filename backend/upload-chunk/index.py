import os
import json
import base64
import boto3
import psycopg2

def handler(event: dict, context) -> dict:
    """Загружает аудиофайл (base64) в S3 через put_object и сохраняет трек в БД.
    action=upload: загружает файл целиком и сохраняет запись
    action=save_poem: сохраняет стихотворение без файла
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    schema = os.environ['MAIN_DB_SCHEMA']

    if action == 'upload':
        file_key = body.get('file_key', '')
        file_b64 = body.get('file', '')
        title = body.get('title', '')
        text = body.get('text', '')

        file_bytes = base64.b64decode(file_b64)
        ext = file_key.rsplit('.', 1)[-1].lower() if '.' in file_key else 'mp3'
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
            (title, 'music', None, file_key, cdn_url)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'id': new_id, 'title': title, 'type': 'music', 'text': text, 'url': cdn_url})
        }

    elif action == 'save_poem':
        title = body.get('title', '')
        text = body.get('text', '')

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute(
            f'INSERT INTO {schema}.tracks (title, type, text, file_key, cdn_url) VALUES (%s, %s, %s, %s, %s) RETURNING id',
            (title, 'poem', text, None, None)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'id': new_id, 'title': title, 'type': 'poem', 'text': text, 'url': None})
        }

    return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Unknown action'})}
