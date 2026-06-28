import { NextResponse } from 'next/server';
import { getLazyHierarchy } from '@/controllers/hierarchyLazy.controller';
import { connectDB } from '@/config/db';

export async function GET(req: Request) {
  try {
    await connectDB();
    
    let responseData: any = null;
    let statusCode = 200;

    const url = new URL(req.url);
    const mockReq = {
      query: {
        parentId: url.searchParams.get('parentId'),
        type: url.searchParams.get('type')
      },
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

    await getLazyHierarchy(mockReq, mockRes, mockNext);

    return NextResponse.json(responseData, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
