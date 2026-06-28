import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary/config';
import { Buffer } from 'buffer';
import { checkAdminAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
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
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}
