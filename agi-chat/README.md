# AGI Chat

A sophisticated multi-agent chat interface designed to simulate Artificial General Intelligence interactions. This project features distinct AI personas that collaborate, debate, and "think" before responding, all powered by local LLMs via Ollama.

## 🌟 Features

*   **Multi-Agent System**: Three distinct AI personas with unique system prompts and roles:
    *   **Atlas (Logic & Strategy)**: Analyzes flaws, uses data, and challenges assumptions.
    *   **Luna (Creative & Visionary)**: Proposes radical, sci-fi ideas and ignores constraints.
    *   **Sage (Ethics & Wisdom)**: Focuses on human impact, morality, and long-term sustainability.
*   **"Thinking" Process**: Agents use `<think>` tags to internalize their reasoning before outputting a response, simulating a stream of consciousness.
*   **Sentinel Integrity Monitor**: A background security system that continuously monitors critical file integrity to prevent tampering.
*   **Internet Access**: Integrated DuckDuckGo search allows agents to fetch real-time context for their discussions.
*   **Multiple Chat Sessions**: Create, rename, switch between, and delete multiple conversation threads.
*   **Local Privacy**: Powered entirely by local LLMs (Ollama), ensuring your data stays on your machine.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 15](https://nextjs.org/) (React)
*   **Language**: TypeScript
*   **Styling**: CSS Modules
*   **AI Backend**: [Ollama](https://ollama.com/) (Local LLM inference)
*   **Search**: `duck-duck-scrape`

## 🚀 Getting Started

### Prerequisites

1.  **Node.js**: Install Node.js (v18+ recommended).
2.  **Ollama**: Download and install [Ollama](https://ollama.com/).
3.  **DeepSeek R1 Model**: Pull the required model:
    ```bash
    ollama pull deepseek-r1:8b
    ```

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/xingxerx/AGI_Chat.git
    cd agi-chat
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the application:
    ```bash
    # Windows (PowerShell)
    .\start_app.ps1
    
    # Or standard npm command
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛡️ Sentinel Background Mode

The **Sentinel** agent has been moved from the active chat to a background role. It now acts as an integrity monitor:
*   **API**: `/api/integrity` checks the SHA-256 hashes of critical system files every second.
*   **UI**: A dedicated monitor in the sidebar displays the system status in real-time.

## 🧠 Agent Design

Each agent is designed to provide a specific cognitive perspective:

| Agent | Role | Color | Focus |
| :--- | :--- | :--- | :--- |
| **Atlas** | Logic | Indigo | Flaws, Data, Skepticism |
| **Luna** | Creative | Pink | Future, Sci-Fi, Metaphors |
| **Sage** | Ethics | Emerald | Humanity, Morality, Safety |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT](LICENSE)
