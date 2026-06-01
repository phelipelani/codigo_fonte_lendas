"""
Upload em massa de figurinhas via boto3.
Espera arquivos id_N_raridade.png onde N e a posicao global (pagina, slot).
"""
import os
import re
import sys
import boto3
import pymysql
from pathlib import Path

if len(sys.argv) < 2:
    print(f"Uso: python {sys.argv[0]} <pasta>")
    sys.exit(1)

PASTA = Path(sys.argv[1])

# === Le .env ===
env = {}
for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

# === MySQL ===
con = pymysql.connect(
    host=env["DB_HOST"], port=int(env["DB_PORT"]),
    user=env["DB_USER"], password=env["DB_PASSWORD"],
    database=env["DB_NAME"], charset="utf8mb4",
)
cur = con.cursor(pymysql.cursors.DictCursor)
cur.execute("""
    SELECT f.id, f.numero, f.nome, f.slot, p.numero AS pag
    FROM album_figurinhas f
    JOIN album_paginas p ON p.id = f.pagina_id
    ORDER BY p.numero, f.slot
""")
figs = cur.fetchall()
mapa = {i + 1: f for i, f in enumerate(figs)}
print(f"Mapa: {len(mapa)} figurinhas")

# === S3 ===
s3 = boto3.client(
    "s3",
    aws_access_key_id=env["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=env["AWS_SECRET_ACCESS_KEY"],
    region_name=env["AWS_REGION"],
)
BUCKET = env["AWS_BUCKET_NAME"]

pat = re.compile(r"^id_(\d+)_([a-z]+)\.(png|jpg|jpeg|webp)$", re.I)

processados, erros, sem_mapa = 0, [], []
for arq in sorted(PASTA.iterdir()):
    m = pat.match(arq.name)
    if not m: continue
    idN, raridade, ext = int(m.group(1)), m.group(2), m.group(3).lower()
    if idN not in mapa:
        sem_mapa.append(f"id_{idN}")
        continue
    fig = mapa[idN]

    # Upload S3
    key = f"figurinhas/fig_{fig['numero']}_{abs(hash(arq.name)) % 100000}.{ext}"
    try:
        with arq.open("rb") as fp:
            s3.upload_fileobj(
                fp, BUCKET, key,
                ExtraArgs={"ContentType": f"image/{ext}"},
            )
        url = f"https://{BUCKET}.s3.{env['AWS_REGION']}.amazonaws.com/{key}"
        cur.execute("UPDATE album_figurinhas SET imagem_url = %s WHERE id = %s", (url, fig["id"]))
        con.commit()
        processados += 1
        if processados % 20 == 0:
            print(f"  ... {processados} processadas")
    except Exception as e:
        erros.append(f"{arq.name}: {e}")

print()
print("=" * 50)
print("  RELATORIO")
print("=" * 50)
print(f"Processadas:        {processados} / {len(mapa)}")
print(f"Sem correspondencia: {len(sem_mapa)}")
print(f"Erros:              {len(erros)}")
if sem_mapa: print("\nSem mapa:", *sem_mapa)
if erros:
    print("\nErros (primeiros 10):")
    for e in erros[:10]: print(f"  - {e}")

con.close()
