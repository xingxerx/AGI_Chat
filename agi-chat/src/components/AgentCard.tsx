import React from 'react';
import styles from './AgentCard.module.css';
import { Agent } from '@/types';

interface AgentCardProps {
    agent: Agent;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
    const isActive = agent.status !== 'idle';

    return (
        <div className={`${styles.card} ${isActive ? styles.active : ''}`}>
            <div className={styles.avatarContainer}>
                {/* Using a simple div for avatar if no image, or img tag */}
                <img
                    src={agent.avatar}
                    alt={agent.name}
                    className={styles.avatar}
                    onError={(e) => {
                        // Fallback to a placeholder or initials if image fails
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${agent.name}&background=random`;
                    }}
                />
                <div className={`${styles.statusIndicator} ${styles[agent.status]}`} />
            </div>
            <div className={styles.name}>{agent.name}</div>
            <div className={styles.role}>{agent.role}</div>
        </div>
    );
};

export default AgentCard;
