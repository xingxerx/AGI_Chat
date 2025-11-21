import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { modelUrl, modelName, prompt, systemPrompt } = body;


        const baseUrl = modelUrl || 'http://localhost:11434';

        // Server-side fetch to Ollama
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                options: {
                    temperature: 1.0,
                    top_p: 0.9,
                    num_gpu: 99,
                    num_ctx: 4096,
                    repeat_penalty: 1.5,
                }
            }),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Ollama API Error: ${response.statusText}` },
                { status: response.status }
            );
        }

        try {
            const data = await response.json();
            // Map /api/chat response to expected format
            return NextResponse.json({
                response: data.message?.content || "",
                // Preserve other fields if needed, but content is main one
            });
        } catch (e) {
            const text = await response.text();
            console.error("Ollama returned non-JSON:", text);
            return NextResponse.json(
                { error: `Ollama returned invalid JSON: ${text.substring(0, 100)}` },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: `Failed to connect to Ollama: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
