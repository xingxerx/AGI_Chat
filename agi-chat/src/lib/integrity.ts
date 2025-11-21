import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MANIFEST_PATH = path.join(process.cwd(), 'integrity_manifest.json');

// Critical files to monitor
const CRITICAL_FILES = [
    'src/hooks/useAgentOrchestrator.ts',
    'src/components/ChatInterface.tsx',
    'src/app/api/generate/route.ts',
    'src/lib/llm.ts'
];

interface FileIntegrity {
    file: string;
    hash: string;
    status: 'SECURE' | 'MODIFIED' | 'MISSING';
    timestamp: number;
}

interface IntegrityManifest {
    generatedAt: number;
    files: Record<string, string>; // filepath -> hash
}

function calculateHash(filePath: string): string | null {
    try {
        const fullPath = path.join(process.cwd(), filePath);
        if (!fs.existsSync(fullPath)) return null;

        const fileBuffer = fs.readFileSync(fullPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    } catch (error) {
        console.error(`Error hashing ${filePath}:`, error);
        return null;
    }
}

export function generateManifest(): IntegrityManifest {
    const files: Record<string, string> = {};

    CRITICAL_FILES.forEach(file => {
        const hash = calculateHash(file);
        if (hash) {
            files[file] = hash;
        }
    });

    const manifest: IntegrityManifest = {
        generatedAt: Date.now(),
        files
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    return manifest;
}

export function verifyIntegrity(): { status: string, details: FileIntegrity[] } {
    // Trust On First Use (TOFU): If no manifest exists, create one.
    if (!fs.existsSync(MANIFEST_PATH)) {
        generateManifest();
    }

    let manifest: IntegrityManifest;
    try {
        manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch (e) {
        // If manifest is corrupt, regenerate
        manifest = generateManifest();
    }

    const details: FileIntegrity[] = [];
    let systemSecure = true;

    CRITICAL_FILES.forEach(file => {
        const currentHash = calculateHash(file);
        const expectedHash = manifest.files[file];

        if (!currentHash) {
            details.push({ file, hash: 'N/A', status: 'MISSING', timestamp: Date.now() });
            systemSecure = false;
        } else if (currentHash !== expectedHash) {
            details.push({ file, hash: currentHash, status: 'MODIFIED', timestamp: Date.now() });
            systemSecure = false;
        } else {
            details.push({ file, hash: currentHash, status: 'SECURE', timestamp: Date.now() });
        }
    });

    return {
        status: systemSecure ? 'SECURE' : 'COMPROMISED',
        details
    };
}
