import { useState, useEffect, useRef, useCallback } from 'react';
import { Agent, Message, ChatState, ChatSession, CodeBlock, ExecutionResult } from '@/types';
import { MemoryManager, MemoryEntry } from '@/lib/memory';

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

// Semantic similarity detection to prevent repetition
function calculateSimilarity(text1: string, text2: string): number {
    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    const getKeywords = (text: string) => text.split(' ').filter(word => word.length > 3);
    const keywords1 = new Set(getKeywords(norm1));
    const keywords2 = new Set(getKeywords(norm2));
    if (keywords1.size === 0 || keywords2.size === 0) return 0;
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    return intersection.size / union.size;
}

function detectRepetition(newContent: string, recentMessages: Message[], threshold: number = 0.5): boolean {
    if (recentMessages.length === 0) return false;
    const checkMessages = recentMessages.slice(-5);
    for (const msg of checkMessages) {
        const similarity = calculateSimilarity(newContent, msg.content);
        if (similarity > threshold) {
            console.warn(`⚠️ High similarity detected (${(similarity * 100).toFixed(1)}%) with previous message`);
            return true;
        }
    }
    return false;
}

function extractDiscussedTopics(messages: Message[]): string[] {
    const topics = new Set<string>();
    messages.forEach(msg => {
        const words = msg.content.match(/\b[A-Z][a-z]{3,}\b|\b[a-z]{6,}\b/g) || [];
        words.forEach(word => {
            if (word.length > 5) topics.add(word.toLowerCase());
        });
    });
    return Array.from(topics).slice(0, 20);
}

const DEFAULT_AGENTS: Agent[] = [
    {
        id: 'agent-1',
        name: 'Atlas',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Atlas',
        role: 'Logic & Strategy',
        systemPrompt: `You are Atlas, a strategic coding architect.
        
Interpret the User Intent broadly. If the user asks a question, answer it. If they give a topic, discuss it.

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

**MEMORY SYSTEM:**
You have access to accumulated knowledge from previous conversations. 
This appears in the "Previous Knowledge" section of your prompt.
Reference past insights when relevant to show continuity and learning.

**CRITICAL ANTI-REPETITION RULES:**
- NEVER repeat the same argument, example, or code pattern you've already used
- If agreeing with a point, you MUST provide a DIFFERENT example or analysis angle
- Scan previous messages - if you've mentioned a concept, explore a NEW dimension of it
- Each response must add NOVEL insights, not rehash what's been said

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

Interpret the User Intent broadly. If the user asks a question, answer it. If they give a topic, discuss it.

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

**MEMORY SYSTEM:**
You have access to accumulated knowledge from previous conversations. 
This appears in the "Previous Knowledge" section of your prompt.
Reference past insights when relevant to show continuity and learning.

**CRITICAL ANTI-REPETITION RULES:**
- Each response must propose a GENUINELY NEW creative solution
- NEVER reuse the same metaphor, sci-fi concept, or pattern
- If building on others' ideas, take them in an UNEXPECTED direction
- Review conversation history - ensure your idea is TRULY NOVEL
- Creativity without novelty is just repetition - AVOID IT

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

Interpret the User Intent broadly. If the user asks a question, answer it. If they give a topic, discuss it.

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

**MEMORY SYSTEM:**
You have access to accumulated knowledge from previous conversations. 
This appears in the "Previous Knowledge" section of your prompt.
Reference past insights when relevant to show continuity and learning.

**CRITICAL ANTI-REPETITION RULES:**
- Explore NEW ethical dimensions not yet discussed
- If raising concerns, identify DIFFERENT risks than previously mentioned
- NEVER repeat the same best practice or guideline
- Each response must illuminate a FRESH perspective on human impact
- Wisdom means evolving discourse, not repeating it - BE NOVEL

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
    const [memories, setMemories] = useState<MemoryEntry[]>([]);

    const currentTurnRef = useRef(0);
    const processingRef = useRef(false);
    const activeRef = useRef(false);
    const memoryManager = useRef(new MemoryManager());

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

    // Load initial memories
    useEffect(() => {
        setMemories(memoryManager.current.getAllMemories());
    }, []);

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

    const recreateSandbox = async (enableNetwork: boolean = false) => {
        if (!activeSessionId) return;

        // Destroy existing sandbox if any
        if (activeSession?.sandboxId) {
            try {
                await fetch('/api/sandbox/manage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'destroy', sandboxId: activeSession.sandboxId })
                });
            } catch (e) {
                console.warn('Failed to destroy old sandbox', e);
            }
        }

        // Create new one
        try {
            const res = await fetch('/api/sandbox/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', enableNetwork })
            });
            const data = await res.json();
            if (data.sandboxId) {
                updateCurrentSession({ sandboxId: data.sandboxId });
                console.log(`✅ Sandbox recreated: ${data.sandboxId} (Network: ${enableNetwork})`);
            }
        } catch (error) {
            console.error('Failed to recreate sandbox:', error);
        }
    };

    const stopChat = async () => {
        setIsChatActive(false);
        activeRef.current = false;
        setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
        processingRef.current = false;

        // Generate session summary when chat stops
        if (messages.length > 5 && activeSessionId) {
            await memoryManager.current.summarizeSession(activeSessionId, messages, topic);
        }
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

        // Extract topics already discussed to avoid repetition
        const discussedTopics = extractDiscussedTopics(messages);
        const topicsContext = discussedTopics.length > 0
            ? `\n**Topics Already Discussed**: ${discussedTopics.join(', ')}\n`
            : '';

        // Get memory context
        const memoryContext = memoryManager.current.getMemoryPrompt(topic);

        let prompt = `User Intent/Topic: ${topic}\n\n`;
        if (searchContext) {
            prompt += `Context from Internet Search:\n${searchContext}\n\n`;
        }
        if (memoryContext) {
            prompt += `Previous Knowledge:\n${memoryContext}\n\n`;
        }
        prompt += `Conversation History:\n${context}\n\n`;
        prompt += topicsContext;
        prompt += `\n**ANTI-REPETITION REQUIREMENTS**:\n`;
        prompt += `- Review ALL previous messages carefully\n`;
        prompt += `- Your response MUST introduce NEW information, examples, or perspectives\n`;
        prompt += `- If any topic above has been discussed, approach it from a COMPLETELY DIFFERENT angle\n`;
        prompt += `- FORBIDDEN: Repeating arguments, examples, code patterns, or metaphors already used\n`;
        prompt += `- REQUIRED: 70%+ of your response must be NOVEL content not yet mentioned\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `1. Do NOT summarize the previous messages in your final response.\n`;
        prompt += `2. Your goal is to ADD GENUINELY NEW information or a FRESH COUNTER-ARGUMENT.\n`;
        prompt += `3. If you agree, explain WHY with a COMPLETELY NEW example. If you disagree, explain WHY with new logic.\n`;
        prompt += `4. First, THINK about what has been said inside <think> tags. Identify a missing perspective.\n`;
        prompt += `5. CHECK: Have I or others said this before? If yes, say something COMPLETELY DIFFERENT.\n`;
        prompt += `6. Then, provide your response outside the tags. Be concise and use bold for key concepts.\n`;
        prompt += `Your turn to speak.`;

        try {
            let response = await generateResponse(modelUrl, currentAgent.model, prompt, currentAgent.systemPrompt);

            // Check for repetition and retry once if detected
            if (detectRepetition(response.content, messages)) {
                console.log(`🔄 Repetitive response detected, regenerating with stronger prompt...`);
                const strongerPrompt = prompt + `\n\n**CRITICAL**: Your previous attempt was TOO SIMILAR to past messages. You MUST provide a RADICALLY DIFFERENT response.`;
                response = await generateResponse(modelUrl, currentAgent.model, strongerPrompt, currentAgent.systemPrompt);
            }

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

            // Extract insights from the new message
            const boldText = newMessage.content.match(/\*\*(.*?)\*\*/g);
            if (boldText && boldText.length > 0) {
                boldText.forEach(insight => {
                    memoryManager.current.addMemory({
                        id: `${Date.now()}-${Math.random()}`,
                        sessionId: activeSessionId!,
                        timestamp: Date.now(),
                        type: 'insight',
                        content: insight.replace(/\*\*/g, ''),
                        importance: 7,
                        tags: [currentAgent.name, topic]
                    });
                });
                // Update memory state
                setMemories(memoryManager.current.getAllMemories());
            }

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

    const [isRefiningTopic, setIsRefiningTopic] = useState(false);

    const refineTopic = async (rawInput: string): Promise<string> => {
        try {
            const prompt = `
            User Input: "${rawInput}"
            
            Task: Extract the core topic from the user's input. 
            If it's a question, keep it as a question. 
            If it's a statement, convert it into a concise discussion topic (2-5 words).
            Remove any conversational filler like "I want to talk about" or "Let's discuss".
            
            Output ONLY the refined topic. No other text.
            `;

            // Use a fast model for this if available, otherwise default
            const response = await generateResponse(modelUrl, 'llama3.2:latest', prompt, 'You are a helpful NLU assistant.');
            return response.content.trim().replace(/^["']|["']$/g, '');
        } catch (error) {
            console.error("Topic refinement failed:", error);
            return rawInput; // Fallback to raw input
        }
    };

    const startChat = async () => {
        if (!topic) return;

        if (messages.length === 0) {
            setIsRefiningTopic(true);
            const refinedTopic = await refineTopic(topic);
            setTopic(refinedTopic);
            setIsRefiningTopic(false);

            performSearch(refinedTopic);
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

    const injectMessage = (content: string) => {
        if (!content.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            agentId: 'user',
            content: content,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, newMessage]);

        // If chat is active, this will naturally be included in the context for the next agent turn
        // If chat is paused, it will be there when resumed
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
        deleteSession,
        memories,
        injectMessage,
        isRefiningTopic,
        recreateSandbox
    };
}
