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
