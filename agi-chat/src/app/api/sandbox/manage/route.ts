import { NextResponse } from 'next/server';
import { createSandbox, destroySandbox, resetSandbox, sandboxExists } from '@/lib/sandbox';

export async function POST(req: Request) {
    try {
        const { action, sandboxId } = await req.json();

        if (action === 'create') {
            const newSandboxId = await createSandbox();
            return NextResponse.json({
                success: true,
                sandboxId: newSandboxId
            });
        }

        if (!sandboxId) {
            return NextResponse.json(
                { error: 'sandboxId required for this action' },
                { status: 400 }
            );
        }

        if (action === 'reset') {
            await resetSandbox(sandboxId);
            return NextResponse.json({
                success: true,
                message: 'Sandbox reset successfully'
            });
        }

        if (action === 'destroy') {
            await destroySandbox(sandboxId);
            return NextResponse.json({
                success: true,
                message: 'Sandbox destroyed successfully'
            });
        }

        if (action === 'status') {
            const exists = await sandboxExists(sandboxId);
            return NextResponse.json({
                exists,
                running: exists
            });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );

    } catch (error: any) {
        console.error('[Sandbox] Management error:', error);
        return NextResponse.json(
            { error: error.message || 'Sandbox operation failed' },
            { status: 500 }
        );
    }
}
