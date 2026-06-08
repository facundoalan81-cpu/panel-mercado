"""
Sube output/signals-latest.json a Cloudflare R2 (S3-compatible).
Requiere env: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
No hace nada (sale 0) si no están definidas -> permite correr el build local sin R2.
"""
import os
import sys

OUT = os.path.join(os.path.dirname(__file__), "output", "signals-latest.json")


def main():
    endpoint = os.environ.get("R2_ENDPOINT")
    key = os.environ.get("R2_ACCESS_KEY_ID")
    secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    bucket = os.environ.get("R2_BUCKET")
    if not all([endpoint, key, secret, bucket]):
        print("R2 no configurado (faltan env vars) — se omite la subida.")
        return 0
    if not os.path.exists(OUT):
        print("No existe signals-latest.json — corré build_signals.py primero.")
        return 1

    import boto3

    s3 = boto3.client(
        "s3", endpoint_url=endpoint,
        aws_access_key_id=key, aws_secret_access_key=secret, region_name="auto",
    )
    with open(OUT, "rb") as f:
        s3.put_object(
            Bucket=bucket, Key="signals-latest.json", Body=f.read(),
            ContentType="application/json",
            CacheControl="public, max-age=300",
        )
    print(f"Subido signals-latest.json a R2 bucket '{bucket}'.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
