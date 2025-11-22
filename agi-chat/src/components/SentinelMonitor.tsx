import React, { useEffect, useState } from 'react';
import styles from './SentinelMonitor.module.css';

interface IntegrityStatus {
    systemStatus: string;
    timestamp: number;
    scannedFiles: number;
}

interface SentinelMonitorProps {
    aiHealth?: {
        status: 'healthy' | 'warning' | 'critical';
        message: string;
        recommendations?: string[];
        conversationHealth?: string;
        ollamaConnected: boolean;
    } | null;
}

const SentinelMonitor: React.FC<SentinelMonitorProps> = ({ aiHealth }) => {
    const [status, setStatus] = useState<IntegrityStatus | null>(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        const checkIntegrity = async () => {
            setScanning(true);
            try {
                const res = await fetch('/api/integrity');
                const data = await res.json();
                setStatus(data);
            } catch (error) {
                console.error('Sentinel Integrity Check Failed:', error);
                setStatus({
                    systemStatus: 'ERROR',
                    timestamp: Date.now(),
                    scannedFiles: 0
                });
            } finally {
                setTimeout(() => setScanning(false), 500);
            }
        };

        checkIntegrity();
        const interval = setInterval(checkIntegrity, 1000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        if (status === 'healthy' || status === 'SECURE') return styles.secure;
        if (status === 'warning') return styles.warning;
        return styles.danger;
    };

    return (
        <div className={styles.monitorContainer}>
            <div className={styles.header}>
                <span className={styles.icon}>🛡️</span>
                <span className={styles.title}>SENTINEL ACTIVE</span>
            </div>

            {/* File Integrity Status */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>FILE INTEGRITY</div>
                <div className={styles.statusDisplay}>
                    <div className={styles.statusRow}>
                        <span className={styles.label}>STATUS:</span>
                        <span className={`${styles.value} ${status?.systemStatus === 'SECURE' ? styles.secure : styles.danger}`}>
                            {status?.systemStatus || 'INIT'}
                        </span>
                    </div>
                    <div className={styles.statusRow}>
                        <span className={styles.label}>FILES:</span>
                        <span className={styles.value}>{status?.scannedFiles || 0}</span>
                    </div>
                </div>
            </div>

            {/* AI Health Analysis */}
            {aiHealth && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI HEALTH</div>
                    <div className={styles.statusDisplay}>
                        <div className={styles.statusRow}>
                            <span className={styles.label}>STATUS:</span>
                            <span className={`${styles.value} ${getStatusColor(aiHealth.status)}`}>
                                {aiHealth.status.toUpperCase()}
                            </span>
                        </div>
                        <div className={styles.statusRow}>
                            <span className={styles.label}>OLLAMA:</span>
                            <span className={`${styles.value} ${aiHealth.ollamaConnected ? styles.secure : styles.danger}`}>
                                {aiHealth.ollamaConnected ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                        {aiHealth.message && (
                            <div className={styles.healthMessage}>
                                {aiHealth.message}
                            </div>
                        )}
                        {aiHealth.conversationHealth && (
                            <div className={styles.aiInsight}>
                                <div className={styles.insightLabel}>🤖 AI Analysis:</div>
                                <div className={styles.insightText}>{aiHealth.conversationHealth}</div>
                            </div>
                        )}
                        {aiHealth.recommendations && aiHealth.recommendations.length > 0 && (
                            <div className={styles.recommendations}>
                                {aiHealth.recommendations.map((rec, idx) => (
                                    <div key={idx} className={styles.recommendation}>⚠️ {rec}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.statusRow}>
                <span className={styles.label}>LAST SCAN:</span>
                <span className={styles.value}>
                    {status ? new Date(status.timestamp).toLocaleTimeString() : '--:--:--'}
                </span>
            </div>

            <div className={`${styles.scanLine} ${scanning ? styles.scanning : ''}`} />
        </div>
    );
};

export default SentinelMonitor;
