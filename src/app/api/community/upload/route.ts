import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '@/config/config';
import { User } from '@/models/User';
import { connectDB } from '@/config/db';

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

    // 3. Save buffer to public workspace
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'community');

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/community/${filename}`;

    // Determine type category
    let typeCategory: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (file.type.startsWith('image/')) {
      typeCategory = 'image';
    } else if (file.type.startsWith('video/')) {
      typeCategory = 'video';
    } else if (file.type.startsWith('audio/')) {
      typeCategory = 'audio';
    }

    return NextResponse.json({
      status: 'success',
      data: {
        fileUrl,
        name: file.name,
        fileType: typeCategory,
        fileSize: file.size
      }
    });
  } catch (error: any) {
    console.error('[Upload API Error]:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'Internal upload error' }, { status: 500 });
  }
}
