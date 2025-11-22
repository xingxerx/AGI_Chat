import { Message } from '@/types';

export interface MemoryEntry {
    id: string;
    sessionId: string;
    timestamp: number;
    type: 'insight' | 'topic' | 'learning' | 'decision';
    content: string;
    importance: number; // 1-10 scale
    tags: string[];
}

export interface GlobalMemory {
    entries: MemoryEntry[];
    conversationHistory: {
        sessionId: string;
        topic: string;
        summary: string;
        keyInsights: string[];
        timestamp: number;
    }[];
    version: number;
}

const MAX_MEMORIES = 1000;
const MEMORY_STORAGE_KEY = 'agi_chat_global_memory';

export class MemoryManager {
    private memory: GlobalMemory;

    constructor() {
        this.memory = this.loadMemory();
    }

    private loadMemory(): GlobalMemory {
        if (typeof window === 'undefined') return this.createEmptyMemory();

        try {
            const saved = localStorage.getItem(MEMORY_STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load memory:', e);
        }
        return this.createEmptyMemory();
    }

    private createEmptyMemory(): GlobalMemory {
        return {
            entries: [],
            conversationHistory: [],
            version: 1
        };
    }

    private saveMemory() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memory));
        } catch (e) {
            console.error('Failed to save memory:', e);
        }
    }

    public addMemory(entry: MemoryEntry) {
        this.memory.entries.push(entry);
        this.pruneMemories();
        this.saveMemory();
    }

    public addSessionSummary(sessionId: string, topic: string, summary: string, insights: string[]) {
        // Check if summary already exists for this session to avoid duplicates
        const existingIndex = this.memory.conversationHistory.findIndex(h => h.sessionId === sessionId);

        const historyEntry = {
            sessionId,
            topic,
            summary,
            keyInsights: insights,
            timestamp: Date.now()
        };

        if (existingIndex >= 0) {
            this.memory.conversationHistory[existingIndex] = historyEntry;
        } else {
            this.memory.conversationHistory.push(historyEntry);
        }

        this.saveMemory();
    }

    public getRelevantMemories(context: string, limit: number = 5): MemoryEntry[] {
        const contextLower = context.toLowerCase();
        const contextWords = contextLower.split(/\s+/).filter(w => w.length > 3);

        const scoredMemories = this.memory.entries.map(entry => {
            let score = 0;

            // Recency score (0-5 points)
            const ageInDays = (Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24);
            score += Math.max(5 - ageInDays, 0);

            // Content matching (10 points per match)
            const contentLower = entry.content.toLowerCase();
            if (contentLower.includes(contextLower)) score += 20;

            // Keyword matching (2 points per match)
            contextWords.forEach(word => {
                if (contentLower.includes(word)) score += 2;
                entry.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(word)) score += 3;
                });
            });

            // Importance weight
            score += entry.importance;

            return { entry, score };
        });

        // Sort by score descending and take top N
        return scoredMemories
            .filter(item => item.score > 5) // Minimum relevance threshold
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.entry);
    }

    public getMemoryPrompt(topic: string): string {
        const relevantMemories = this.getRelevantMemories(topic, 5);
        const recentHistory = this.memory.conversationHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3);

        let prompt = '';

        if (relevantMemories.length > 0) {
            prompt += `**Relevant Past Insights:**\n`;
            relevantMemories.forEach(m => {
                prompt += `- ${m.content} (Tags: ${m.tags.join(', ')})\n`;
            });
            prompt += '\n';
        }

        if (recentHistory.length > 0) {
            prompt += `**Recent Conversation Context:**\n`;
            recentHistory.forEach(h => {
                if (h.topic && h.summary) {
                    prompt += `- Topic: ${h.topic}\n  Summary: ${h.summary}\n`;
                }
            });
        }

        return prompt;
    }

    private pruneMemories() {
        if (this.memory.entries.length <= MAX_MEMORIES) return;

        // Sort by importance and recency, keep top MAX_MEMORIES
        this.memory.entries.sort((a, b) => {
            const scoreA = a.importance + (a.timestamp / 10000000000); // Weight importance heavily, recency slightly
            const scoreB = b.importance + (b.timestamp / 10000000000);
            return scoreB - scoreA;
        });

        this.memory.entries = this.memory.entries.slice(0, MAX_MEMORIES);
    }

    public async summarizeSession(sessionId: string, messages: Message[], topic: string): Promise<void> {
        if (messages.length < 5) return;

        try {
            const response = await fetch('/api/memory/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, topic, sessionId })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.summary) {
                    this.addSessionSummary(sessionId, topic, data.summary, data.insights || []);
                    console.log('✅ Session summarized and saved to memory');
                }
            }
        } catch (error) {
            console.error('Failed to summarize session:', error);
        }
    }

    public getAllMemories(): MemoryEntry[] {
        return this.memory.entries;
    }

    public clearMemory() {
        this.memory = this.createEmptyMemory();
        this.saveMemory();
    }
}
