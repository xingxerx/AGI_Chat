import React, { useEffect, useRef } from 'react';
import styles from './ChatInterface.module.css';
import AgentCard from './AgentCard';
import MessageBubble from './MessageBubble';
import ControlPanel from './ControlPanel';
import ChatSidebar from './ChatSidebar';
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';
import { useSentinelAI } from '@/hooks/useSentinelAI';

const ChatInterface: React.FC = () => {
    const {
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
        injectMessage
    } = useAgentOrchestrator();

    // Sentinel AI monitoring
    const { health: aiHealth } = useSentinelAI(messages, isChatActive, topic);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className={styles.layout}>
            <ChatSidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSwitchSession={switchSession}
                onCreateSession={createSession}
                onDeleteSession={deleteSession}
                aiHealth={aiHealth}
                memories={memories}
            />
            <div className={styles.container}>
                {/* Agents Header */}
                <div className={styles.agentsArea}>
                    {agents.map(agent => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </div>

                {/* Messages Area */}
                <div className={styles.messagesArea}>
                    {messages.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>💬</div>
                            <h3>Ready to Start</h3>
                            <p>Select a topic and start the discussion to see the agents in action.</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            if (msg.agentId === 'user') {
                                const userAgent = {
                                    id: 'user',
                                    name: 'You',
                                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
                                    role: 'User Input',
                                    systemPrompt: '',
                                    model: '',
                                    status: 'idle' as const,
                                    color: '#64748b'
                                };
                                return (
                                    <MessageBubble key={msg.id} message={msg} agent={userAgent} />
                                );
                            }

                            const agent = agents.find(a => a.id === msg.agentId);
                            if (!agent) return null;
                            return (
                                <MessageBubble key={msg.id} message={msg} agent={agent} />
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Controls */}
                <div className={styles.controlsArea}>
                    <ControlPanel
                        topic={topic}
                        setTopic={setTopic}
                        isChatActive={isChatActive}
                        onStart={startChat}
                        onStop={stopChat}
                        onClearMemory={clearMemory}
                        modelUrl={modelUrl}
                        setModelUrl={setModelUrl}
                        hasMessages={messages.length > 0}
                        onInject={injectMessage}
                    />
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
