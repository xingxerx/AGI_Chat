import React from 'react';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
    topic: string;
    setTopic: (topic: string) => void;
    isChatActive: boolean;
    onStart: () => void;
    onStop: () => void;
    onClearMemory: () => void;
    modelUrl: string;
    setModelUrl: (url: string) => void;
    hasMessages: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    topic,
    setTopic,
    isChatActive,
    onStart,
    onStop,
    onClearMemory,
    modelUrl,
    setModelUrl,
    hasMessages
}) => {
    return (
        <div className={styles.panel}>
            <div className={styles.row}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Discussion Topic</label>
                    <input
                        className={styles.input}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., The Future of AGI, Quantum Computing..."
                        disabled={isChatActive}
                    />
                </div>

                {isChatActive ? (
                    <button className={`${styles.button} ${styles.stopBtn}`} onClick={onStop}>
                        Pause
                    </button>
                ) : (
                    <button className={`${styles.button} ${styles.startBtn}`} onClick={onStart}>
                        {hasMessages ? 'Resume' : 'Start'}
                    </button>
                )}
            </div>

            <div className={styles.configSection}>
                <span className={styles.configTitle}>Model Configuration (DeepSeek R1)</span>
                <div className={styles.inputGroup}>
                    <input
                        className={styles.input}
                        value={modelUrl}
                        onChange={(e) => setModelUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                    />
                </div>
                <button onClick={onClearMemory} className={styles.clearBtn} title="Clear Chat Memory">
                    Clear Memory
                </button>
            </div>
        </div>
    );
};

export default ControlPanel;
