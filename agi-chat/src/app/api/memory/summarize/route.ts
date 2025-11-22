import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { messages, topic, sessionId } = await req.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
        }

        // Construct a prompt to summarize the conversation and extract insights
        const summaryPrompt = `
    Analyze the following conversation and provide a concise summary and key insights.
    
    Topic: ${topic || 'General Discussion'}
    
    Conversation:
    ${messages.slice(-20).map((m: any) => `${m.agentId}: ${m.content.substring(0, 300)}`).join('\n')}
    
    INSTRUCTIONS:
    1. Provide a 2-3 sentence summary of the main discussion points.
    2. Extract 3-5 key insights, facts, or decisions made (bullet points).
    3. Format the output as JSON.

    Example Output Format:
    {
      "summary": "The agents discussed the implications of...",
      "insights": [
        "Insight 1",
        "Insight 2"
      ]
    }
    
    RESPONSE (JSON ONLY):
    `;

        const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemma2:9b', // Using a capable model for summarization
                prompt: summaryPrompt,
                format: 'json',
                stream: false,
                options: {
                    temperature: 0.3,
                    num_ctx: 4096
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        let parsedResult;

        try {
            parsedResult = JSON.parse(data.response);
        } catch (e) {
            // Fallback if model doesn't return valid JSON despite instruction
            console.warn('Failed to parse JSON from LLM response, using raw text fallback');
            parsedResult = {
                summary: data.response.substring(0, 500),
                insights: []
            };
        }

        return NextResponse.json({
            summary: parsedResult.summary,
            insights: parsedResult.insights,
            sessionId
        });

    } catch (error) {
        console.error('Summarization failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
