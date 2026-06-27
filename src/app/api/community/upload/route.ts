import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '@/config/config';
import { User } from '@/models/User';
import { connectDB } from '@/config/db';
import crypto from 'crypto';

// Increase body size limit for large video/document uploads (100MB)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s timeout for large uploads

// Allowed MIME types for community uploads
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/tiff',
  // Videos
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'video/3gpp',
  // Audio
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/webm',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed', 'application/x-zip-compressed',
];

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // 1. Authenticate JWT token from headers or cookies
    let token = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')?.split(' ')[1]
      : null;

    if (!token) {
      token = request.cookies.get('accessToken')?.value || null;
    }

    if (!token) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized: Token missing' }, { status: 401 });
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized: User not found' }, { status: 401 });
    }

    // 2. Parse Multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ status: 'error', message: 'No file provided' }, { status: 400 });
    }

    // 3. Validate file type
    const mimeType = file.type || 'application/octet-stream';
    const isAllowed = ALLOWED_TYPES.some(t => mimeType.startsWith(t) || mimeType === t);
    if (!isAllowed) {
      return NextResponse.json({
        status: 'error',
        message: `File type "${mimeType}" is not supported. Please upload images, videos, audio, or documents.`
      }, { status: 400 });
    }

    // 4. Save buffer to public workspace
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename
    const ext = file.name.split('.').pop() || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${crypto.randomUUID()}_${safeName}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'community');

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/community/${filename}`;

    // Determine type category
    let typeCategory: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (mimeType.startsWith('image/')) typeCategory = 'image';
    else if (mimeType.startsWith('video/')) typeCategory = 'video';
    else if (mimeType.startsWith('audio/')) typeCategory = 'audio';

    return NextResponse.json({
      status: 'success',
      data: {
        fileUrl,
        name: file.name,
        fileType: typeCategory,
        fileSize: file.size,
        mimeType
      }
    });
  } catch (error: any) {
    console.error('[Upload API Error]:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'Internal upload error' }, { status: 500 });
  }
}
