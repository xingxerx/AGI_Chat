export type AgentStatus = 'idle' | 'thinking' | 'speaking';

export interface Agent {
  id: string;
  name: string;
  avatar: string; // URL or emoji
  role: string;
  systemPrompt: string;
  status: AgentStatus;
  color: string; // For UI accents
}

export interface Attachment {
  type: 'image' | 'file';
  url: string;
  name?: string;
}

export interface Message {
  id: string;
  agentId: string;
  content: string;
  thoughtProcess?: string; // The internal monologue (DeepSeek R1 style)
  timestamp: number;
  attachments?: Attachment[];
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
}
