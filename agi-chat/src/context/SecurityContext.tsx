import React, { createContext, useContext, useState, useEffect } from 'react';
import { SentinelHealth } from '@/types';

type SecurityStatus = 'SECURE' | 'COMPROMISED' | 'UNKNOWN';

interface SecurityContextType {
    status: SecurityStatus;
    isLockdown: boolean;
    checkIntegrity: () => Promise<void>;
    sentinelData: SentinelHealth | null;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<SecurityStatus>('UNKNOWN');
    const [sentinelData, setSentinelData] = useState<SentinelHealth | null>(null);

    const checkIntegrity = async () => {
        try {
            const res = await fetch('/api/integrity');
            const data = await res.json();
            setStatus(data.systemStatus);
            setSentinelData(data);
        } catch (error) {
            console.error("Integrity check failed:", error);
            setStatus('UNKNOWN');
        }
    };

    // Initial check
    useEffect(() => {
        checkIntegrity();
        // Poll every 5 seconds
        const interval = setInterval(checkIntegrity, 5000);
        return () => clearInterval(interval);
    }, []);

    const value = {
        status,
        isLockdown: status === 'COMPROMISED',
        checkIntegrity,
        sentinelData
    };

    return (
        <SecurityContext.Provider value={value}>
            {children}
        </SecurityContext.Provider>
    );
}

export function useSecurity() {
    const context = useContext(SecurityContext);
    if (context === undefined) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
}
