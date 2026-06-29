import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/config/db';

export async function GET() {
  const start = Date.now();
  
  try {
    // Ensure DB is connected
    await connectDB();
    
    // Calculate response time
    const responseTime = Date.now() - start;
    
    const dbState = mongoose.connection.readyState;
    const statuses = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
      99: 'Uninitialized'
    };
    
    return NextResponse.json({
      status: 'UP',
      mongoDB: {
        status: statuses[dbState as keyof typeof statuses] || 'Unknown',
        database: mongoose.connection.name || 'Unknown',
        clusterHost: mongoose.connection.host || 'Unknown',
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'DOWN',
      error: error.message,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }
}
