import React from 'react';
import styles from './ChatSidebar.module.css';
import { ChatSession, SentinelHealth } from '@/types';
import SentinelMonitor from './SentinelMonitor';
import { MemoryPanel } from './MemoryPanel';
import { MemoryEntry } from '@/lib/memory';

interface ChatSidebarProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSwitchSession: (id: string) => void;
    onCreateSession: () => void;
    onDeleteSession: (id: string) => void;
    aiHealth?: SentinelHealth | null;
    memories: MemoryEntry[];
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    sessions,
    activeSessionId,
    onSwitchSession,
    onCreateSession,
    onDeleteSession,
    aiHealth,
    memories
}) => {
    const [showAbout, setShowAbout] = React.useState(false);

    return (
        <div className={styles.sidebar}>
            {/* Project Info Section */}
            <div className={styles.projectInfo}>
                <div className={styles.projectHeader} onClick={() => setShowAbout(!showAbout)}>
                    <h1 className={styles.projectTitle}>AGI Chat</h1>
                    <button className={styles.toggleBtn}>
                        {showAbout ? '▼' : '►'}
                    </button>
                </div>
                {showAbout && (
                    <div className={styles.aboutContent}>
                        <p className={styles.description}>
                            A sophisticated multi-agent chat interface designed to simulate AGI interactions with distinct AI personas.
                        </p>
                        <div className={styles.features}>
                            <h3>✨ Features</h3>
                            <ul>
                                <li><strong>Multi-Agent System</strong>: Atlas (Logic), Luna (Creative), Sage (Ethics)</li>
                                <li><strong>Thinking Process</strong>: Agents use &lt;think&gt; tags for reasoning</li>
                                <li><strong>Sentinel Monitor</strong>: Background integrity monitoring</li>
                                <li><strong>Internet Access</strong>: Real-time search via DuckDuckGo</li>
                                <li><strong>Local Privacy</strong>: Powered by Ollama</li>
                            </ul>
                        </div>
                        <div className={styles.techStack}>
                            <h3>🛠️ Tech Stack</h3>
                            <p>Next.js 15 • TypeScript • Ollama • DeepSeek R1</p>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.header}>
                <h2>Chats</h2>
                <button onClick={onCreateSession} className={styles.newChatBtn}>
                    + New Chat
                </button>
            </div>
            <div className={styles.sessionList}>
                {sessions
                    .sort((a, b) => b.lastModified - a.lastModified)
                    .map(session => (
                        <div
                            key={session.id}
                            className={`${styles.sessionItem} ${session.id === activeSessionId ? styles.active : ''}`}
                            onClick={() => onSwitchSession(session.id)}
                        >
                            <div className={styles.sessionInfo}>
                                <span className={styles.sessionName}>
                                    {session.name || 'New Chat'}
                                </span>
                                <span className={styles.sessionDate}>
                                    {new Date(session.lastModified).toLocaleDateString()}
                                </span>
                            </div>
                            <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession(session.id);
                                }}
                                title="Delete Chat"
                            >
                                ×
                            </button>
                        </div>
                    ))}
            </div>
            <SentinelMonitor aiHealth={aiHealth} />
            <MemoryPanel memories={memories} />
        </div>
    );
};

export default ChatSidebar;
