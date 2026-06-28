import { NextResponse } from 'next/server';
import { getOrgTree } from '@/controllers/orgTree.controller';
import { connectDB } from '@/config/db';

export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Create mock req/res for the controller since it's an express controller
    let responseData: any = null;
    let statusCode = 200;

    const mockReq = {
      query: {},
      user: { role: 'ROOT_ADMIN' }
    } as any;

    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        responseData = data;
      }
    } as any;

    const mockNext = (error: any) => {
      statusCode = 500;
      responseData = { status: 'error', message: error?.message || 'Internal Server Error' };
    };

    await getOrgTree(mockReq, mockRes, mockNext);

    return NextResponse.json(responseData, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
