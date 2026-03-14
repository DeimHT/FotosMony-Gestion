import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function getR2Client(): S3Client | null {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export async function uploadToR2({
  buffer,
  key,
  contentType,
}: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!client || !bucket) {
    throw new Error("R2 no configurado. Verifica las variables de entorno CLOUDFLARE_R2_*");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL no está definida");
  }

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!client || !bucket) return;

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Extrae el key relativo desde una URL completa de R2 */
export function keyFromUrl(url: string): string | null {
  const base = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base || !url.startsWith(base)) return null;
  return url.slice(base.replace(/\/$/, "").length + 1);
}
