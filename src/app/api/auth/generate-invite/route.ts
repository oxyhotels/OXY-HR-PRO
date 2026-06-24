import { NextResponse } from 'next/server';
import { connectDB } from '../../../../config/db';
import { InviteLink } from '../../../../models/InviteLink';
import { User } from '../../../../models/User';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, inviteType = 'employee' } = body;

    if (!userId) {
      return NextResponse.json({ status: 'error', message: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 404 });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Determine the base URL for the invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
    const inviteLinkUrl = `${baseUrl}/invite/${inviteCode}`;

    const newInvite = new InviteLink({
      inviteCode,
      inviteLink: inviteLinkUrl,
      qrCode: 'frontend-generated', // We will generate QR on frontend using qrcode.react
      organizationId: user.hotel || user.organizationId, // Fallback if needed
      departmentId: user.departmentId || null,
      department: user.department,
      managerId: user._id,
      createdBy: user._id,
      status: 'Active',
      inviteType,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await newInvite.save();

    return NextResponse.json({
      status: 'success',
      invite: newInvite
    });
  } catch (error: any) {
    console.error('Generate Invite Error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
