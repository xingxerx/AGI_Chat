import React, { useEffect, useState } from 'react';
import styles from './SentinelMonitor.module.css';

interface IntegrityStatus {
    systemStatus: string;
    timestamp: number;
    scannedFiles: number;
}

const SentinelMonitor: React.FC = () => {
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
                setTimeout(() => setScanning(false), 500); // Visual pulse
            }
        };

        // Initial check
        checkIntegrity();

        // Poll every second
        const interval = setInterval(checkIntegrity, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.monitorContainer}>
            <div className={styles.header}>
                <span className={styles.icon}>🛡️</span>
                <span className={styles.title}>SENTINEL ACTIVE</span>
            </div>

            <div className={styles.statusDisplay}>
                <div className={styles.statusRow}>
                    <span className={styles.label}>SYSTEM:</span>
                    <span className={`${styles.value} ${status?.systemStatus === 'SECURE' ? styles.secure : styles.danger}`}>
                        {status?.systemStatus || 'INITIALIZING...'}
                    </span>
                </div>
                <div className={styles.statusRow}>
                    <span className={styles.label}>FILES SCANNED:</span>
                    <span className={styles.value}>{status?.scannedFiles || 0}</span>
                </div>
                <div className={styles.statusRow}>
                    <span className={styles.label}>LAST SCAN:</span>
                    <span className={styles.value}>
                        {status ? new Date(status.timestamp).toLocaleTimeString() : '--:--:--'}
                    </span>
                </div>
            </div>

            <div className={`${styles.scanLine} ${scanning ? styles.scanning : ''}`} />
        </div>
    );
};

export default SentinelMonitor;
