import os
import json
import psycopg2

def handler(event: dict, context) -> dict:
    """Возвращает треки/стихи и управляет постами блога."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    schema = os.environ['MAIN_DB_SCHEMA']
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'tracks')

    # --- БЛОГ ---
    if resource == 'blog':
        if method == 'GET':
            cur.execute(f'SELECT id, title, content, created_at FROM {schema}.blog_posts ORDER BY created_at DESC')
            rows = cur.fetchall()
            posts = [{'id': r[0], 'title': r[1], 'content': r[2], 'created_at': r[3].isoformat()} for r in rows]
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                    'body': json.dumps({'posts': posts})}

        if method == 'POST':
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
            cur.execute(f'INSERT INTO {schema}.blog_posts (title, content) VALUES (%s, %s) RETURNING id, created_at', (title, content))
            row = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'id': row[0], 'created_at': row[1].isoformat()})}

    # --- ТРЕКИ (по умолчанию) ---
    cur.execute(f'SELECT id, title, type, text, cdn_url FROM {schema}.tracks WHERE hidden IS NOT TRUE ORDER BY created_at DESC')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    tracks = [{'id': r[0], 'title': r[1], 'type': r[2], 'text': r[3], 'url': r[4]} for r in rows]
    return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'tracks': tracks})}
