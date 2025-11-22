import { useState, useEffect } from 'react';
import { SentinelHealth, Message } from '@/types';

export function useSentinelAI(messages: Message[], isChatActive: boolean, topic: string) {
    const [health, setHealth] = useState<SentinelHealth | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const checkHealth = async () => {
            setIsAnalyzing(true);
            try {
                const res = await fetch('/api/sentinel/health', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages,
                        isChatActive,
                        topic
                    })
                });

                const data = await res.json();
                setHealth(data);
            } catch (error) {
                console.error('Sentinel health check failed:', error);
                setHealth({
                    status: 'critical',
                    message: 'Health check failed',
                    lastCheck: Date.now(),
                    ollamaConnected: false
                });
            } finally {
                setTimeout(() => setIsAnalyzing(false), 500);
            }
        };

        // Check immediately
        checkHealth();

        // Poll every 10 seconds (less frequent than integrity check)
        const interval = setInterval(checkHealth, 10000);

        return () => clearInterval(interval);
    }, [messages.length, isChatActive, topic]); // Only re-run when these change

    return { health, isAnalyzing };
}
