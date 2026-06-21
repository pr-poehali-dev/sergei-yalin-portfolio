import os
import json
import base64
import boto3
import psycopg2

HEADERS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

def handler(event: dict, context) -> dict:
    """Загрузка аудио чанками в /tmp, затем put_object в S3.
    action=chunk: принимает чанк base64, сохраняет в /tmp/{upload_id}.part
    action=finish: собирает файл из /tmp, загружает в S3, сохраняет в БД
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

    if action == 'chunk':
        upload_id = body.get('upload_id', '')
        chunk_b64 = body.get('chunk', '')
        chunk_bytes = base64.b64decode(chunk_b64)
        tmp_path = f'/tmp/{upload_id}.part'
        with open(tmp_path, 'ab') as f:
            f.write(chunk_bytes)
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    elif action == 'finish':
        upload_id = body.get('upload_id', '')
        file_key = body.get('file_key', '')
        title = body.get('title', '')
        text = body.get('text', '')
        ext = file_key.rsplit('.', 1)[-1].lower() if '.' in file_key else 'mp3'
        content_type = 'audio/mpeg' if ext == 'mp3' else f'audio/{ext}'

        tmp_path = f'/tmp/{upload_id}.part'
        with open(tmp_path, 'rb') as f:
            file_bytes = f.read()
        os.remove(tmp_path)

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

        return {'statusCode': 200, 'headers': HEADERS,
                'body': json.dumps({'id': new_id, 'title': title, 'type': 'music', 'text': text, 'url': cdn_url})}

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