import { NextResponse } from 'next/server';
import { verifyIntegrity } from '@/lib/integrity';

export async function GET() {
    const { status, details } = verifyIntegrity();

    return NextResponse.json({
        systemStatus: status,
        timestamp: Date.now(),
        scannedFiles: details.length,
        details: details
    });
}
