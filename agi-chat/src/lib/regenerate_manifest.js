const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_PATH = path.join(process.cwd(), 'integrity_manifest.json');

const CRITICAL_FILES = [
    'src/hooks/useAgentOrchestrator.ts',
    'src/components/ChatInterface.tsx',
    'src/app/api/generate/route.ts',
    'src/lib/llm.ts'
];

function calculateHash(filePath) {
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

const files = {};
CRITICAL_FILES.forEach(file => {
    const hash = calculateHash(file);
    if (hash) files[file] = hash;
});

const manifest = {
    generatedAt: Date.now(),
    files
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log('Manifest regenerated successfully.');
