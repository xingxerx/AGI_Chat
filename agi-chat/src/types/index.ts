export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  systemPrompt: string;
  model: string;
  status: 'idle' | 'thinking' | 'speaking';
  color: string;
}

export interface Attachment {
  type: string;
  url: string;
  name: string;
}

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
  result?: ExecutionResult;
}

export interface Message {
  id: string;
  agentId: string;
  content: string;
  thoughtProcess?: string; // The internal monologue (DeepSeek R1 style)
  timestamp: number;
  attachments?: Attachment[];
  codeBlocks?: CodeBlock[]; // Code blocks detected in the message
}

export interface ChatState {
  topic: string;
  isActive: boolean;
  messages: Message[];
  agents: Agent[];
}

export interface ChatSession {
  id: string;
  name: string;
  topic: string;
  messages: Message[];
  lastModified: number;
  sandboxId?: string; // Associated sandbox container ID
}

export interface SentinelHealth {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  recommendations?: string[];
  lastCheck: number;
  ollamaConnected: boolean;
  conversationHealth?: string;
}

export interface ConversationMetrics {
  repetitionScore: number; // 0-100, higher = more repetitive
  diversityScore: number;  // 0-100, higher = more diverse
  topicsDiscussed: string[];
  messageCount: number;
}
