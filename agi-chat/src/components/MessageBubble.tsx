import React, { useState } from 'react';
import styles from './MessageBubble.module.css';
import { Message, Agent } from '@/types';

interface MessageBubbleProps {
    message: Message;
    agent: Agent;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, agent }) => {
    const [isThoughtOpen, setIsThoughtOpen] = useState(false);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.agentName} style={{ color: agent.color }}>{agent.name}</span>
                <span className={styles.timestamp}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <div className={styles.bubble}>
                {message.thoughtProcess && (
                    <div className={styles.thoughtProcess}>
                        <div
                            className={styles.thoughtSummary}
                            onClick={() => setIsThoughtOpen(!isThoughtOpen)}
                        >
                            <span>{isThoughtOpen ? '▼' : '▶'}</span>
                            Thought Process
                        </div>
                        {isThoughtOpen && (
                            <div className={styles.thoughtContent}>
                                {message.thoughtProcess}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.content}>
                    {message.content}
                </div>

                {message.attachments && message.attachments.map((att, idx) => (
                    <div key={idx} className={styles.attachment}>
                        {att.type === 'image' && (
                            <img src={att.url} alt="Attachment" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MessageBubble;
