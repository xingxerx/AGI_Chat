export interface LLMResponse {
    content: string;
    thoughtProcess?: string;
}

export async function generateResponse(
    modelUrl: string,
    modelName: string,
    prompt: string,
    systemPrompt: string
): Promise<LLMResponse> {
    // Call our own Next.js API route to avoid CORS
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                modelUrl,
                modelName,
                prompt,
                systemPrompt
            }),
        });

        if (!response.ok) {
            throw new Error(`API Proxy Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // The API route already parses the response, but let's double check structure
        // Depending on how we returned it in route.ts. 
        // Wait, in route.ts we returned `data` from Ollama directly.
        // So we still need to parse the thought process here OR in the route.
        // Let's parse it here to keep logic consistent with previous version, 
        // OR better yet, let's parse it here since the route just proxies the raw JSON.

        const rawText = data.response;

        // Parse Thought Process (DeepSeek R1 usually uses <think> tags)
        const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
        const match = rawText.match(thinkRegex);

        let thoughtProcess = '';
        let content = rawText;

        if (match) {
            thoughtProcess = match[1].trim();
            content = rawText.replace(match[0], '').trim();
        }

        return {
            content,
            thoughtProcess
        };

    } catch (error) {
        console.error("LLM Call Failed:", error);
        return {
            content: `I am having trouble connecting to my brain (Ollama). Error: ${(error as Error).message || 'Unknown error'}`,
            thoughtProcess: "Connection failed."
        };
    }
}
// Compromise test