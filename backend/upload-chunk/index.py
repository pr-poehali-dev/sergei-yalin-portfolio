import os
import json
import base64
import boto3
import psycopg2

def handler(event: dict, context) -> dict:
    """Принимает чанк файла (base64), собирает multipart upload в S3. 
    action=init: начинает загрузку, возвращает upload_id
    action=chunk: загружает часть файла
    action=complete: завершает загрузку, сохраняет трек в БД
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

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )

    if action == 'init':
        file_key = body['file_key']
        ext = file_key.rsplit('.', 1)[-1].lower()
        content_type = 'audio/mpeg' if ext == 'mp3' else f'audio/{ext}'
        resp = s3.create_multipart_upload(Bucket='files', Key=file_key, ContentType=content_type)
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'upload_id': resp['UploadId']})
        }

    elif action == 'chunk':
        file_key = body['file_key']
        upload_id = body['upload_id']
        part_number = body['part_number']
        chunk_b64 = body['chunk']
        chunk_bytes = base64.b64decode(chunk_b64)
        resp = s3.upload_part(Bucket='files', Key=file_key, UploadId=upload_id, PartNumber=part_number, Body=chunk_bytes)
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'etag': resp['ETag']})
        }

    elif action == 'complete':
        file_key = body.get('file_key', '')
        upload_id = body.get('upload_id', '')
        parts = body.get('parts', [])
        title = body['title']
        track_type = body.get('type', 'music')
        text = body.get('text', '')

        cdn_url = None
        if file_key and upload_id and parts:
            s3.complete_multipart_upload(
                Bucket='files', Key=file_key, UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute(
            f'INSERT INTO {schema}.tracks (title, type, text, file_key, cdn_url) VALUES (%s, %s, %s, %s, %s) RETURNING id',
            (title, track_type, text if track_type == 'poem' else None, file_key or None, cdn_url)
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

    return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Unknown action'})}