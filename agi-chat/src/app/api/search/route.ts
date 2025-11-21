import { NextResponse } from 'next/server';
import { searchWeb } from '@/lib/search';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        const results = await searchWeb(query);
        return NextResponse.json({ results });

    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json(
            { error: "Failed to perform search" },
            { status: 500 }
        );
    }
}
