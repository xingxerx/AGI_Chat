import React, { useState } from 'react';
import styles from './LockdownOverlay.module.css';

interface LockdownOverlayProps {
    onEnterSafeMode: () => void;
    onVerifyAndMount: () => Promise<void>;
}

const LockdownOverlay: React.FC<LockdownOverlayProps> = ({ onEnterSafeMode, onVerifyAndMount }) => {
    const [isMounting, setIsMounting] = useState(false);

    const handleMount = async () => {
        setIsMounting(true);
        await onVerifyAndMount();
        setIsMounting(false);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <div className={styles.icon}>🛡️</div>
                <h2 className={styles.title}>System Lockdown Active</h2>
                <p className={styles.description}>
                    Sentinel has detected unauthorized file modifications.
                    The system has been locked down to prevent potential damage.
                </p>

                <div className={styles.actions}>
                    <button className={styles.safeModeBtn} onClick={onEnterSafeMode}>
                        Enter Safe Mode (Docker Isolated)
                    </button>

                    <button
                        className={styles.mountBtn}
                        onClick={handleMount}
                        disabled={isMounting}
                    >
                        {isMounting ? 'Verifying...' : 'Verify & Mount Updates'}
                    </button>
                </div>

                <p className={styles.hint}>
                    Safe Mode allows web browsing and code execution within an isolated Docker container.
                    Mounting updates will regenerate the integrity manifest.
                </p>
            </div>
        </div>
    );
};

export default LockdownOverlay;
