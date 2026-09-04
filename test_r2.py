import boto3, os
from dotenv import load_dotenv

load_dotenv()

s3 = boto3.client('s3',
    endpoint_url=os.getenv('R2_ENDPOINT'),
    aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'))

s3.upload_file('test.mp3', os.getenv('R2_BUCKET'), 'audio/es/test.mp3',
    ExtraArgs={
        'ContentType': 'audio/mpeg',
        'CacheControl': 'public, max-age=31536000, immutable'
    })

print("Uploaded — opening in browser to verify:")
print("https://media.shopnilacademy.com/audio/es/test.mp3")