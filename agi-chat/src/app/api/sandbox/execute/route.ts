import { NextResponse } from 'next/server';
import { executeCode, sandboxExists } from '@/lib/sandbox';

export async function POST(req: Request) {
    try {
        const { sandboxId, code, language } = await req.json();

        if (!sandboxId || !code) {
            return NextResponse.json(
                { error: 'Missing required fields: sandboxId, code' },
                { status: 400 }
            );
        }

        // Verify sandbox exists
        const exists = await sandboxExists(sandboxId);
        if (!exists) {
            return NextResponse.json(
                { error: 'Sandbox not found or not running' },
                { status: 404 }
            );
        }

        console.log(`[Sandbox] Executing code in ${sandboxId}`);
        const result = await executeCode(sandboxId, code, language || 'javascript');

        return NextResponse.json({
            success: true,
            result
        });

    } catch (error: any) {
        console.error('[Sandbox] Execution error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to execute code' },
            { status: 500 }
        );
    }
}
