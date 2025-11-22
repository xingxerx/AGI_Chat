import React from 'react';
import { MemoryEntry } from '@/lib/memory';
import styles from './MemoryPanel.module.css';

interface MemoryPanelProps {
    memories: MemoryEntry[];
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ memories }) => {
    // Sort by timestamp descending
    const sortedMemories = [...memories].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>🧠 Agent Memory</h3>
                <span className={styles.count}>{memories.length} items</span>
            </div>

            <div className={styles.memoryList}>
                {sortedMemories.length === 0 ? (
                    <div className={styles.empty}>No memories yet. Chat to build knowledge!</div>
                ) : (
                    sortedMemories.slice(0, 10).map(memory => (
                        <div key={memory.id} className={styles.memoryItem}>
                            <div className={styles.tags}>
                                {memory.tags.map(tag => (
                                    <span key={tag} className={styles.tag}>{tag}</span>
                                ))}
                            </div>
                            <p className={styles.content}>{memory.content}</p>
                            <div className={styles.meta}>
                                <span className={styles.type}>{memory.type}</span>
                                <span className={styles.time}>
                                    {new Date(memory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
