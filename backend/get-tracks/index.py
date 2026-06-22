import os
import json
import base64
import uuid
import boto3
import psycopg2

def handler(event: dict, context) -> dict:
    """Возвращает треки/стихи и управляет постами блога (с фото)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
        }, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    schema = os.environ['MAIN_DB_SCHEMA']
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'tracks')

    def check_auth():
        headers = event.get('headers') or {}
        token = headers.get('X-Admin-Token') or headers.get('x-admin-token', '')
        return token == os.environ.get('ADMIN_PASSWORD', '')

    # --- БЛОГ ---
    if resource == 'blog':
        if method == 'GET':
            cur.execute(f'SELECT id, title, content, image_url, created_at FROM {schema}.blog_posts ORDER BY created_at DESC')
            rows = cur.fetchall()
            posts = [{'id': r[0], 'title': r[1], 'content': r[2], 'image_url': r[3], 'created_at': r[4].isoformat()} for r in rows]
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                    'body': json.dumps({'posts': posts})}

        if method == 'POST':
            if not check_auth():
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Неверный пароль'})}
            body = json.loads(event.get('body') or '{}')
            action = body.get('action', 'create')

            if action == 'delete':
                cur.execute(f'DELETE FROM {schema}.blog_posts WHERE id = %s', (body.get('id'),))
                conn.commit()
                cur.close()
                conn.close()
                return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'ok': True})}

            title = body.get('title', '').strip()
            content = body.get('content', '').strip()
            if not title or not content:
                return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Заполните заголовок и текст'})}

            image_url = None
            image_b64 = body.get('image_b64', '')
            image_mime = body.get('image_mime', 'image/jpeg')
            if image_b64:
                s3 = boto3.client(
                    's3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
                )
                ext = image_mime.split('/')[-1].replace('jpeg', 'jpg')
                key = f'blog/{uuid.uuid4()}.{ext}'
                s3.put_object(Bucket='files', Key=key, Body=base64.b64decode(image_b64), ContentType=image_mime)
                image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            cur.execute(
                f'INSERT INTO {schema}.blog_posts (title, content, image_url) VALUES (%s, %s, %s) RETURNING id, created_at',
                (title, content, image_url)
            )
            row = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'id': row[0], 'created_at': row[1].isoformat(), 'image_url': image_url})}

    # --- ТРЕКИ (по умолчанию) ---
    if method == 'POST':
        if not check_auth():
            cur.close(); conn.close()
            return {'statusCode': 403, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Неверный пароль'})}
        body = json.loads(event.get('body') or '{}')
        if body.get('action') == 'delete_track':
            cur.execute(f'DELETE FROM {schema}.tracks WHERE id = %s', (body.get('id'),))
            conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'ok': True})}

    cur.execute(f'SELECT id, title, type, text, cdn_url FROM {schema}.tracks WHERE hidden IS NOT TRUE ORDER BY created_at DESC')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    tracks = [{'id': r[0], 'title': r[1], 'type': r[2], 'text': r[3], 'url': r[4]} for r in rows]
    return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'tracks': tracks})}