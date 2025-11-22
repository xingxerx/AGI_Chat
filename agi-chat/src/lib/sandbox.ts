import Docker from 'dockerode';
import path from 'path';
import fs from 'fs';

const docker = new Docker();
const SANDBOX_IMAGE = 'agi-sandbox:latest';
const EXECUTION_TIMEOUT = 30000; // 30 seconds
const MEMORY_LIMIT = 512 * 1024 * 1024; // 512MB

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    error?: string;
}

export interface CodeBlock {
    language: string;
    code: string;
    executed: boolean;
}

/**
 * Build the sandbox Docker image
 */
export async function buildSandboxImage(): Promise<void> {
    try {
        const dockerfilePath = path.join(process.cwd(), 'docker', 'sandbox');

        const stream = await docker.buildImage({
            context: dockerfilePath,
            src: ['Dockerfile']
        }, {
            t: SANDBOX_IMAGE
        });

        await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
        });

        console.log(`✅ Sandbox image ${SANDBOX_IMAGE} built successfully`);
    } catch (error) {
        console.error('Failed to build sandbox image:', error);
        throw error;
    }
}

/**
 * Create a new sandbox container
 */
export async function createSandbox(): Promise<string> {
    try {
        // Ensure image exists
        const images = await docker.listImages({ filters: { reference: [SANDBOX_IMAGE] } });
        if (images.length === 0) {
            await buildSandboxImage();
        }

        const container = await docker.createContainer({
            Image: SANDBOX_IMAGE,
            Cmd: ['tail', '-f', '/dev/null'], // Keep container running
            WorkingDir: '/workspace',
            HostConfig: {
                Memory: MEMORY_LIMIT,
                NetworkMode: 'none', // Disable network access for security
                AutoRemove: false
            },
            Tty: true,
            AttachStdin: false,
            AttachStdout: true,
            AttachStderr: true,
        });

        await container.start();
        console.log(`✅ Sandbox created: ${container.id}`);
        return container.id;
    } catch (error) {
        console.error('Failed to create sandbox:', error);
        throw error;
    }
}

/**
 * Execute code in a sandbox container
 */
export async function executeCode(
    sandboxId: string,
    code: string,
    language: string = 'javascript'
): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
        const container = docker.getContainer(sandboxId);

        // Only support JavaScript/Node.js for now
        if (language !== 'javascript' && language !== 'js' && language !== 'typescript' && language !== 'ts') {
            return {
                stdout: '',
                stderr: `Language '${language}' not supported. Only JavaScript/TypeScript is supported.`,
                exitCode: 1,
                executionTime: Date.now() - startTime,
                error: 'Unsupported language'
            };
        }

        // Write code to a temporary file in the container
        const fileName = `code_${Date.now()}.js`;
        const exec = await container.exec({
            Cmd: ['sh', '-c', `cat > ${fileName} << 'EOF'\n${code}\nEOF`],
            AttachStdout: true,
            AttachStderr: true,
        });

        await exec.start({ hijack: true });

        // Execute the code with timeout
        const execRun = await container.exec({
            Cmd: ['node', fileName],
            AttachStdout: true,
            AttachStderr: true,
        });

        const stream = await execRun.start({ hijack: true });

        let stdout = '';
        let stderr = '';

        // Set timeout for execution
        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Execution timeout')), EXECUTION_TIMEOUT);
        });

        const executionPromise = new Promise<void>((resolve) => {
            stream.on('data', (chunk: Buffer) => {
                const str = chunk.toString('utf8');
                // Docker multiplexes stdout/stderr, so we parse it
                if (chunk[0] === 1) { // stdout
                    stdout += str.slice(8);
                } else if (chunk[0] === 2) { // stderr
                    stderr += str.slice(8);
                }
            });

            stream.on('end', () => resolve());
        });

        await Promise.race([executionPromise, timeoutPromise]);

        const inspectData = await execRun.inspect();
        const exitCode = inspectData.ExitCode || 0;

        // Clean up the file
        const cleanupExec = await container.exec({
            Cmd: ['rm', fileName],
            AttachStdout: false,
            AttachStderr: false,
        });
        await cleanupExec.start({ hijack: true });

        return {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode,
            executionTime: Date.now() - startTime
        };

    } catch (error: any) {
        return {
            stdout: '',
            stderr: error.message || 'Unknown error',
            exitCode: 1,
            executionTime: Date.now() - startTime,
            error: error.message
        };
    }
}

/**
 * Write a file to the sandbox
 */
export async function writeFile(
    sandboxId: string,
    filePath: string,
    content: string
): Promise<void> {
    try {
        // Validate file path to prevent directory traversal
        if (filePath.includes('..') || filePath.startsWith('/')) {
            throw new Error('Invalid file path');
        }

        const container = docker.getContainer(sandboxId);
        const exec = await container.exec({
            Cmd: ['sh', '-c', `cat > ${filePath} << 'EOF'\n${content}\nEOF`],
            AttachStdout: true,
            AttachStderr: true,
        });

        await exec.start({ hijack: true });
    } catch (error) {
        console.error('Failed to write file:', error);
        throw error;
    }
}

/**
 * Read a file from the sandbox
 */
export async function readFile(
    sandboxId: string,
    filePath: string
): Promise<string> {
    try {
        // Validate file path
        if (filePath.includes('..') || filePath.startsWith('/')) {
            throw new Error('Invalid file path');
        }

        const container = docker.getContainer(sandboxId);
        const exec = await container.exec({
            Cmd: ['cat', filePath],
            AttachStdout: true,
            AttachStderr: true,
        });

        const stream = await exec.start({ hijack: true });

        let content = '';

        await new Promise<void>((resolve) => {
            stream.on('data', (chunk: Buffer) => {
                content += chunk.toString('utf8').slice(8); // Remove Docker header
            });
            stream.on('end', () => resolve());
        });

        return content.trim();
    } catch (error) {
        console.error('Failed to read file:', error);
        throw error;
    }
}

/**
 * List files in the sandbox
 */
export async function listFiles(sandboxId: string): Promise<string[]> {
    try {
        const container = docker.getContainer(sandboxId);
        const exec = await container.exec({
            Cmd: ['ls', '-1'],
            AttachStdout: true,
            AttachStderr: true,
        });

        const stream = await exec.start({ hijack: true });

        let output = '';

        await new Promise<void>((resolve) => {
            stream.on('data', (chunk: Buffer) => {
                output += chunk.toString('utf8').slice(8);
            });
            stream.on('end', () => resolve());
        });

        return output.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
        console.error('Failed to list files:', error);
        return [];
    }
}

/**
 * Reset sandbox by removing all files
 */
export async function resetSandbox(sandboxId: string): Promise<void> {
    try {
        const container = docker.getContainer(sandboxId);
        const exec = await container.exec({
            Cmd: ['sh', '-c', 'rm -rf /workspace/* /workspace/.[!.]*'],
            AttachStdout: true,
            AttachStderr: true,
        });

        await exec.start({ hijack: true });
        console.log(`✅ Sandbox ${sandboxId} reset`);
    } catch (error) {
        console.error('Failed to reset sandbox:', error);
        throw error;
    }
}

/**
 * Destroy a sandbox container
 */
export async function destroySandbox(sandboxId: string): Promise<void> {
    try {
        const container = docker.getContainer(sandboxId);
        await container.stop();
        await container.remove();
        console.log(`✅ Sandbox ${sandboxId} destroyed`);
    } catch (error) {
        console.error('Failed to destroy sandbox:', error);
        throw error;
    }
}

/**
 * Check if sandbox exists and is running
 */
export async function sandboxExists(sandboxId: string): Promise<boolean> {
    try {
        const container = docker.getContainer(sandboxId);
        const info = await container.inspect();
        return info.State.Running;
    } catch (error) {
        return false;
    }
}
