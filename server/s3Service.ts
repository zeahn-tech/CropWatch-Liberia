import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

let s3Client: S3Client | null = null;

function getS3Client(): { client: S3Client; bucketName: string } | null {
  const bucketName = process.env.S3_BUCKET_NAME;
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT;

  if (bucketName && accessKeyId && secretAccessKey) {
    if (!s3Client) {
      s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint: endpoint || undefined,
        forcePathStyle: endpoint ? true : undefined,
      });
    }
    return { client: s3Client, bucketName };
  }
  return null;
}

export interface UploadedImageInfo {
  url: string;
  size: number;
  mimeType: string;
}

/**
 * Uploads a base64 or buffer image to S3-compatible storage or falls back to local storage
 */
export async function uploadImage(
  imageBase64OrBuffer: string | Buffer,
  fileNamePrefix: string = 'img'
): Promise<UploadedImageInfo> {
  let buffer: Buffer;
  let mimeType = 'image/jpeg';

  if (typeof imageBase64OrBuffer === 'string') {
    if (imageBase64OrBuffer.startsWith('data:')) {
      const matches = imageBase64OrBuffer.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(imageBase64OrBuffer, 'utf-8');
      }
    } else if (imageBase64OrBuffer.startsWith('http://') || imageBase64OrBuffer.startsWith('https://')) {
      // It's already a public URL, just return it
      return {
        url: imageBase64OrBuffer,
        size: 0,
        mimeType,
      };
    } else {
      buffer = Buffer.from(imageBase64OrBuffer, 'base64');
    }
  } else {
    buffer = imageBase64OrBuffer;
  }

  const extension = mimeType.split('/')[1] || 'jpg';
  const fileName = `${fileNamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
  const size = buffer.length;

  const s3 = getS3Client();
  if (s3) {
    try {
      console.log(`☁️ Uploading image ${fileName} (${size} bytes) to S3 bucket ${s3.bucketName}...`);
      const command = new PutObjectCommand({
        Bucket: s3.bucketName,
        Key: `uploads/${fileName}`,
        Body: buffer,
        ContentType: mimeType,
      });
      await s3.client.send(command);

      // Construct public URL
      const endpoint = process.env.S3_ENDPOINT;
      let url = '';
      if (endpoint) {
        url = `${endpoint.replace(/\/$/, '')}/${s3.bucketName}/uploads/${fileName}`;
      } else {
        url = `https://${s3.bucketName}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/uploads/${fileName}`;
      }
      return { url, size, mimeType };
    } catch (e) {
      console.error('❌ S3 upload failed, falling back to local saving:', e);
    }
  }

  // Fallback: Save locally in public directory for development/preview
  console.log(`💾 S3 not configured or failed. Saving image locally to public/uploads/...`);
  const publicDir = path.join(process.cwd(), 'public');
  const uploadsDir = path.join(publicDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const localFilePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(localFilePath, buffer);

  const url = `/uploads/${fileName}`;
  return { url, size, mimeType };
}
