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
    onInject: (content: string) => void;
    onForcePivot: () => void;
    isRefiningTopic?: boolean;
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
    hasMessages,
    onInject,
    onForcePivot,
    isRefiningTopic = false
}) => {
    const [suggestion, setSuggestion] = React.useState('');

    const handleInject = () => {
        if (suggestion.trim()) {
            onInject(suggestion);
            setSuggestion('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleInject();
        }
    };

    return (
        <div className={styles.panel}>
            <div className={styles.row}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>
                        {isChatActive ? 'Inject Suggestion / New Topic' : 'What would you like to discuss?'}
                    </label>
                    {isChatActive ? (
                        <div className={styles.injectContainer}>
                            <input
                                className={styles.input}
                                value={suggestion}
                                onChange={(e) => setSuggestion(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a suggestion to guide the agents..."
                            />
                            <button
                                className={styles.injectBtn}
                                onClick={handleInject}
                                disabled={!suggestion.trim()}
                            >
                                Send
                            </button>
                        </div>
                    ) : (
                        <input
                            className={styles.input}
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., I want to explore the ethics of AI..."
                        />
                    )}
                </div>

                {isChatActive ? (
                    <button className={`${styles.button} ${styles.stopBtn}`} onClick={onStop}>
                        Pause
                    </button>
                ) : (
                    <button
                        className={`${styles.button} ${styles.startBtn}`}
                        onClick={onStart}
                        disabled={isRefiningTopic}
                    >
                        {isRefiningTopic ? 'Thinking...' : (hasMessages ? 'Resume' : 'Start')}
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
                {isChatActive && (
                    <button onClick={onForcePivot} className={styles.pivotBtn} title="Force conversation to pivot away from repetitive topics">
                        🔄 Force Pivot
                    </button>
                )}
            </div>
        </div>
    );
};

export default ControlPanel;
