const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_PATH = path.join(__dirname, 'integrity_manifest.json');

// Critical files to monitor
const CRITICAL_FILES = [
    'src/hooks/useAgentOrchestrator.ts',
    'src/components/ChatInterface.tsx',
    'src/app/api/generate/route.ts',
    'src/lib/llm.ts'
];

function calculateHash(filePath) {
    try {
        const fullPath = path.join(__dirname, filePath);
        if (!fs.existsSync(fullPath)) {
            console.warn(`⚠️  File not found: ${filePath}`);
            return null;
        }

        const fileBuffer = fs.readFileSync(fullPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    } catch (error) {
        console.error(`❌ Error hashing ${filePath}:`, error.message);
        return null;
    }
}

function generateManifest() {
    console.log('🔒 Regenerating Integrity Manifest...\n');

    const files = {};
    let successCount = 0;

    CRITICAL_FILES.forEach(file => {
        const hash = calculateHash(file);
        if (hash) {
            files[file] = hash;
            console.log(`✅ ${file}`);
            console.log(`   Hash: ${hash.substring(0, 16)}...`);
            successCount++;
        }
    });

    const manifest = {
        generatedAt: Date.now(),
        files
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    console.log(`\n✨ Manifest regenerated successfully!`);
    console.log(`📁 Files scanned: ${successCount}/${CRITICAL_FILES.length}`);
    console.log(`📍 Manifest location: ${MANIFEST_PATH}`);
    console.log(`⏰ Generated at: ${new Date(manifest.generatedAt).toLocaleString()}`);
    console.log('\n🛡️  Sentinel status should now show: SECURE\n');

    return manifest;
}

// Run the script
try {
    generateManifest();
    process.exit(0);
} catch (error) {
    console.error('❌ Failed to regenerate manifest:', error.message);
    process.exit(1);
}
