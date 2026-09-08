import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary/config';
import { Buffer } from 'buffer';
import { checkAdminAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed formats: JPEG, PNG, WEBP, GIF, SVG.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload stream promise wrapper
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'pahadi-vibes' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({ success: true, url: uploadResult.secure_url });
  } catch (error: any) {
    logger.error('Upload error', error);
    return NextResponse.json({ success: false, error: 'Upload failed. Please check file and try again.' }, { status: 500 });
  }
}
