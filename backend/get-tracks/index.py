import os
import json
import psycopg2

def handler(event: dict, context) -> dict:
    """Возвращает список всех треков и стихов из базы данных."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    schema = os.environ['MAIN_DB_SCHEMA']

    cur.execute(f'SELECT id, title, type, text, cdn_url FROM {schema}.tracks WHERE hidden IS NOT TRUE ORDER BY created_at DESC')
    rows = cur.fetchall()
    cur.close()
    conn.close()

    tracks = [{'id': r[0], 'title': r[1], 'type': r[2], 'text': r[3], 'url': r[4]} for r in rows]

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'tracks': tracks})
    }