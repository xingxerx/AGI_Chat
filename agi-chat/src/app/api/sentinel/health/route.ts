import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { messages, isChatActive, topic } = await req.json();

        const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

        // Check Ollama connectivity
        let ollamaConnected = false;
        try {
            const healthCheck = await fetch(`${ollamaUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            ollamaConnected = healthCheck.ok;
        } catch {
            ollamaConnected = false;
        }

        // Analyze conversation health using AI
        let aiAnalysis = '';
        if (ollamaConnected && messages.length > 5) {
            const recentMessages = messages.slice(-10).map((m: any) => m.content).join('\n\n');

            const prompt = `Analyze this AGI chat conversation for health issues:

Topic: ${topic || 'Not set'}
Chat Active: ${isChatActive}
Messages: ${messages.length}

Recent conversation:
${recentMessages}

Provide a brief health assessment (1-2 sentences). Check for:
1. Repetitive arguments or stuck patterns
2. Healthy conversation flow
3. Whether agents are adding new value

Assessment:`;

            try {
                const response = await fetch(`${ollamaUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gemma2:9b',
                        messages: [{ role: 'user', content: prompt }],
                        options: { temperature: 0.3, num_ctx: 2048 },
                        stream: false
                    }),
                    signal: AbortSignal.timeout(10000)
                });

                if (response.ok) {
                    const data = await response.json();
                    aiAnalysis = data.message?.content || '';
                }
            } catch (error) {
                console.error('[Sentinel] AI analysis failed:', error);
            }
        }

        // Determine status
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let message = 'System operating normally';
        const recommendations: string[] = [];

        if (!ollamaConnected) {
            status = 'critical';
            message = 'Ollama connection lost';
            recommendations.push('Check that Ollama is running');
            recommendations.push('Verify connection to http://localhost:11434');
        } else if (!isChatActive && messages.length === 0) {
            status = 'healthy';
            message = 'Ready to start conversation';
        } else if (isChatActive && messages.length > 50) {
            status = 'warning';
            message = 'Long conversation - may need refresh';
            recommendations.push('Consider starting a new chat session');
        } else if (isChatActive) {
            status = 'healthy';
            message = 'Agents conversing actively';
        }

        return NextResponse.json({
            status,
            message,
            recommendations: recommendations.length > 0 ? recommendations : undefined,
            lastCheck: Date.now(),
            ollamaConnected,
            conversationHealth: aiAnalysis || undefined
        });

    } catch (error: any) {
        console.error('[Sentinel] Health check error:', error);
        return NextResponse.json({
            status: 'critical',
            message: 'Health check failed',
            lastCheck: Date.now(),
            ollamaConnected: false,
            error: error.message
        }, { status: 500 });
    }
}
