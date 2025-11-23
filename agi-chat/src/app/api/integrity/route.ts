import { NextResponse } from 'next/server';
import { verifyIntegrity, generateManifest } from '@/lib/integrity';

export async function GET() {
    const { status, details } = verifyIntegrity();

    return NextResponse.json({
        systemStatus: status,
        timestamp: Date.now(),
        scannedFiles: details.length,
        details: details
    });
}

export async function POST() {
    try {
        generateManifest();
        return NextResponse.json({ success: true, message: 'Manifest regenerated' });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to regenerate manifest' }, { status: 500 });
    }
}
