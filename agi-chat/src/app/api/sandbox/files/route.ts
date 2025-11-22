import { NextResponse } from 'next/server';
import { readFile, writeFile, listFiles } from '@/lib/sandbox';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sandboxId = searchParams.get('sandboxId');
        const filePath = searchParams.get('path');

        if (!sandboxId) {
            return NextResponse.json(
                { error: 'Missing sandboxId parameter' },
                { status: 400 }
            );
        }

        // If path is provided, read specific file
        if (filePath) {
            const content = await readFile(sandboxId, filePath);
            return NextResponse.json({ content });
        }

        // Otherwise, list all files
        const files = await listFiles(sandboxId);
        return NextResponse.json({ files });

    } catch (error: any) {
        console.error('[Sandbox] File read error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to read file' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const { sandboxId, path, content } = await req.json();

        if (!sandboxId || !path || content === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: sandboxId, path, content' },
                { status: 400 }
            );
        }

        await writeFile(sandboxId, path, content);

        return NextResponse.json({
            success: true,
            message: `File ${path} written successfully`
        });

    } catch (error: any) {
        console.error('[Sandbox] File write error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to write file' },
            { status: 500 }
        );
    }
}
