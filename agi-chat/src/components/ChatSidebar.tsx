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
    return (
        <div className={styles.sidebar}>
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
