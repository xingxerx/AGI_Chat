import React from 'react';
import styles from './ChatSidebar.module.css';
import { ChatSession } from '@/types';
import SentinelMonitor from './SentinelMonitor';

interface ChatSidebarProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSwitchSession: (id: string) => void;
    onCreateSession: () => void;
    onDeleteSession: (id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    sessions,
    activeSessionId,
    onSwitchSession,
    onCreateSession,
    onDeleteSession
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
            <SentinelMonitor />
        </div>
    );
};

export default ChatSidebar;
