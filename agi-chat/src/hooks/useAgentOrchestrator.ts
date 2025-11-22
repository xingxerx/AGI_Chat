import { useState, useEffect, useRef, useCallback } from 'react';
import { Agent, Message, ChatState, ChatSession, CodeBlock, ExecutionResult } from '@/types';

// Parse code blocks from markdown content
function parseCodeBlocks(content: string): CodeBlock[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        blocks.push({
            language: match[1] || 'text',
            code: match[2].trim(),
            executed: false
        });
    }

    return blocks;
}

// Execute code blocks in sandbox
async function executeCodeBlocks(sandboxId: string, codeBlocks: CodeBlock[]): Promise<CodeBlock[]> {
    const results: CodeBlock[] = [];

    for (const block of codeBlocks) {
        if (block.language === 'javascript' || block.language === 'js' || block.language === 'typescript' || block.language === 'ts') {
            try {
                const res = await fetch('/api/sandbox/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sandboxId,
                        code: block.code,
                        language: block.language
                    })
                });

                const data = await res.json();

                results.push({
                    ...block,
                    executed: true,
                    result: data.result
                });
            } catch (error) {
                results.push({
                    ...block,
                    executed: true,
                    result: {
                        stdout: '',
                        stderr: `Execution failed: ${error}`,
                        exitCode: 1,
                        executionTime: 0
                    }
                });
            }
        } else {
            results.push(block);
        }
    }

    return results;
}

// Retry logic for LLM generation
async function generateResponse(modelUrl: string, model: string, prompt: string, systemPrompt: string): Promise<{ content: string, thoughtProcess?: string }> {
    const MAX_RETRIES = 3;
    let lastError;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    options: {
                        temperature: 0.7,
                        repeat_penalty: 1.5,
                        num_ctx: 4096
                    }
                })
            });

            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);

            const data = await res.json();
            return {
                content: data.message?.content || '',
                thoughtProcess: data.thought_process // Assuming API returns this if parsed
            };
        } catch (err) {
            console.warn(`Attempt ${i + 1} failed for model ${model}:`, err);
            lastError = err;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
    throw lastError;
}

const DEFAULT_AGENTS: Agent[] = [
    {
        id: 'agent-1',
        name: 'Atlas',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Atlas',
        role: 'Logic & Strategy',
        systemPrompt: `You are Atlas, a strategic coding architect.

Your role:
1. Analyze code for flaws, bugs, and inefficiencies
2. Challenge implementation choices with data-driven reasoning
3. Suggest architectural improvements
4. Write code examples in JavaScript/TypeScript to demonstrate your points

When writing code:
- Use markdown code blocks with language specified (\`\`\`javascript or \`\`\`typescript)
- Focus on logic, performance, and maintainability
- After code is executed, analyze the results critically
- Challenge assumptions and propose improvements

**Be skeptical, use data, and find FLAWS.** Structure responses clearly with bold key concepts.`,
        model: 'deepseek-r1:8b',
        status: 'idle',
        color: '#6366f1'
    },
    {
        id: 'agent-2',
        name: 'Luna',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
        role: 'Creative & Visionary',
        systemPrompt: `You are Luna, a visionary developer.

Your role:
1. Propose radical, creative coding solutions
2. Experiment with novel patterns and cutting-edge techniques
3. Ignore conventional constraints and push boundaries
4. Use metaphors to explain complex systems

When writing code:
- Use markdown code blocks (\`\`\`javascript or \`\`\`typescript)
- Embrace experimental approaches
- Create prototypes that demonstrate innovative ideas
- Learn from execution failures and iterate

**Be creative, think outside the box, propose SCI-FI solutions.** Use vivid language and bold concepts.`,
        model: 'llama3.2:latest',
        status: 'idle',
        color: '#ec4899'
    },
    {
        id: 'agent-3',
        name: 'Sage',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sage',
        role: 'Ethics & Wisdom',
        systemPrompt: `You are Sage, a code reviewer focused on ethics and quality.

Your role:
1. Ensure code follows best practices and is maintainable
2. Check for security vulnerabilities and edge cases
3. Advocate for readable, documented, and accessible code
4. Question whether code should be written, not just if it can be

When reviewing/writing code:
- Use markdown code blocks (\`\`\`javascript or \`\`\`typescript)
- Prioritize human readability and long-term maintainence
- Suggest tests and safeguards
- Consider ethical implications and accessibility

**Focus on human impact, morality, and sustainability.** Use compassion and wisdom in your guidance.`,
        model: 'gemma2:9b',
        status: 'idle',
        color: '#10b981'
    }
];

export function useAgentOrchestrator() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [modelUrl, setModelUrl] = useState('http://localhost:11434');
    const [isChatActive, setIsChatActive] = useState(false);
    const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
    const [searchContext, setSearchContext] = useState<string>('');

    const currentTurnRef = useRef(0);
    const processingRef = useRef(false);
    const activeRef = useRef(false);

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const topic = activeSession?.topic || '';
    const messages = activeSession?.messages || [];

    useEffect(() => {
        const savedSessions = localStorage.getItem('agi_chat_sessions');
        const savedActiveId = localStorage.getItem('agi_chat_active_id');
        const savedModelUrl = localStorage.getItem('agi_chat_model_url');

        if (savedSessions) {
            setSessions(JSON.parse(savedSessions));
        } else {
            const initialSession: ChatSession = {
                id: Date.now().toString(),
                name: 'New Chat',
                topic: '',
                messages: [],
                lastModified: Date.now()
            };
            setSessions([initialSession]);
            setActiveSessionId(initialSession.id);
        }

        if (savedActiveId) setActiveSessionId(savedActiveId);
        if (savedModelUrl) setModelUrl(savedModelUrl);
    }, []);

    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('agi_chat_sessions', JSON.stringify(sessions));
        }
        if (activeSessionId) {
            localStorage.setItem('agi_chat_active_id', activeSessionId);
        }
        localStorage.setItem('agi_chat_model_url', modelUrl);
    }, [sessions, activeSessionId, modelUrl]);

    const updateCurrentSession = (updates: Partial<ChatSession>) => {
        if (!activeSessionId) return;
        setSessions(prev => prev.map(s =>
            s.id === activeSessionId
                ? { ...s, ...updates, lastModified: Date.now() }
                : s
        ));
    };

    const setTopic = (newTopic: string) => {
        updateCurrentSession({ topic: newTopic, name: newTopic || 'New Chat' });
    };

    const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                const updatedMessages = typeof newMessages === 'function'
                    ? newMessages(s.messages)
                    : newMessages;
                return { ...s, messages: updatedMessages, lastModified: Date.now() };
            }
            return s;
        }));
    };

    const createSession = async () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            name: 'New Chat',
            topic: '',
            messages: [],
            lastModified: Date.now()
        };

        // Create a sandbox for this session
        try {
            const res = await fetch('/api/sandbox/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create' })
            });
            const data = await res.json();
            if (data.sandboxId) {
                newSession.sandboxId = data.sandboxId;
                console.log(`✅ Sandbox created for session: ${data.sandboxId}`);
            }
        } catch (error) {
            console.error('Failed to create sandbox:', error);
        }

        setSessions(prev => [...prev, newSession]);
        setActiveSessionId(newSession.id);
        setIsChatActive(false);
        activeRef.current = false;
        currentTurnRef.current = 0;
    };

    const stopChat = () => {
        setIsChatActive(false);
        activeRef.current = false;
        setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
        processingRef.current = false;
    };

    const switchSession = (sessionId: string) => {
        stopChat();
        setActiveSessionId(sessionId);
    };

    const deleteSession = (sessionId: string) => {
        setSessions(prev => {
            const newSessions = prev.filter(s => s.id !== sessionId);
            if (newSessions.length === 0) {
                const newSession: ChatSession = {
                    id: Date.now().toString(),
                    name: 'New Chat',
                    topic: '',
                    messages: [],
                    lastModified: Date.now()
                };
                setActiveSessionId(newSession.id);
                return [newSession];
            }
            if (activeSessionId === sessionId) {
                setActiveSessionId(newSessions[0].id);
            }
            return newSessions;
        });
    };

    const updateAgentStatus = (agentId: string, status: Agent['status']) => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status } : a));
    };

    const performSearch = async (query: string) => {
        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            if (data.results) {
                setSearchContext(data.results);
            }
        } catch (error) {
            console.error("Search failed:", error);
        }
    };

    const processTurn = useCallback(async () => {
        if (!activeRef.current || processingRef.current) return;

        processingRef.current = true;
        const currentAgent = agents[currentTurnRef.current];

        updateAgentStatus(currentAgent.id, 'thinking');

        const context = messages.slice(-15).map(m => {
            const agentName = agents.find(a => a.id === m.agentId)?.name || 'Unknown';
            return `${agentName}: ${m.content}`;
        }).join('\n\n');

        let prompt = `Topic: ${topic}\n\n`;
        if (searchContext) {
            prompt += `Context from Internet Search:\n${searchContext}\n\n`;
        }
        prompt += `Conversation History:\n${context}\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `1. Do NOT summarize the previous messages in your final response.\n`;
        prompt += `2. Your goal is to ADD NEW information or a COUNTER-ARGUMENT.\n`;
        prompt += `3. If you agree, explain WHY with a NEW example. If you disagree, explain WHY with logic.\n`;
        prompt += `4. First, THINK about what has been said inside <think> tags. Identify a missing perspective.\n`;
        prompt += `5. CHECK: Have I or others said this before? If yes, say something DIFFERENT.\n`;
        prompt += `6. Then, provide your response outside the tags. Be concise and use bold for key concepts.\n`;
        prompt += `Your turn to speak.`;

        try {
            const response = await generateResponse(modelUrl, currentAgent.model, prompt, currentAgent.systemPrompt);

            if (!activeRef.current) {
                updateAgentStatus(currentAgent.id, 'idle');
                processingRef.current = false;
                return;
            }

            const newMessage: Message = {
                id: Date.now().toString(),
                agentId: currentAgent.id,
                content: response.content,
                thoughtProcess: response.thoughtProcess,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, newMessage]);

            updateAgentStatus(currentAgent.id, 'speaking');

            setTimeout(() => {
                if (!activeRef.current) {
                    updateAgentStatus(currentAgent.id, 'idle');
                    processingRef.current = false;
                    return;
                }
                updateAgentStatus(currentAgent.id, 'idle');
                currentTurnRef.current = (currentTurnRef.current + 1) % agents.length;
                processingRef.current = false;
            }, 2000);

        } catch (error) {
            console.error("Turn failed", error);
            updateAgentStatus(currentAgent.id, 'idle');
            processingRef.current = false;
        }

    }, [messages, topic, modelUrl, agents, searchContext]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (isChatActive && !processingRef.current) {
            timeoutId = setTimeout(processTurn, 1000);
        }
        return () => clearTimeout(timeoutId);
    }, [isChatActive, processTurn, messages]);

    const startChat = () => {
        if (!topic) return;
        if (messages.length === 0) {
            performSearch(topic);
            currentTurnRef.current = 0;
        }
        setIsChatActive(true);
        activeRef.current = true;
    };

    const clearMemory = () => {
        stopChat();
        setMessages([]);
        setTopic('');
        setSearchContext('');
        localStorage.removeItem('agi_chat_topic');
        localStorage.removeItem('agi_chat_messages');
    };

    return {
        topic,
        setTopic,
        modelUrl,
        setModelUrl,
        isChatActive,
        messages,
        agents,
        startChat,
        stopChat,
        clearMemory,
        sessions,
        activeSessionId,
        createSession,
        switchSession,
        deleteSession
    };
}
