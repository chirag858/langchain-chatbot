# LangChain.js Chatbot (Groq + Llama 3)

A beginner-friendly CLI chatbot built with **Node.js**, **LangChain.js**, and **Groq** (free AI inference). It remembers the conversation history during a session and responds using the Llama 3.3 70B model.

---

## What This Project Does

- Runs in your terminal as a chat interface
- Sends your messages to an AI model via Groq's free API
- Remembers the last 20 exchanges (rolling conversation memory)
- Exits cleanly when you type `exit`, `quit`, or `bye`

---

## Project Structure

```
langchainchatbot/
├── index.js          # Main chatbot logic
├── package.json      # Project dependencies
├── .env              # Your secret API key (never commit this)
├── .env.example      # Template showing which keys are needed
├── .gitignore        # Tells git to ignore node_modules and .env
└── guide.md          # LangChain concepts guide for beginners
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A free Groq API key from [console.groq.com](https://console.groq.com)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/chirag858/langchain-chatbot.git
cd langchain-chatbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and add your Groq API key:

```
GROQ_API_KEY=gsk_your_key_here
```

Get a free key at [console.groq.com](https://console.groq.com) → API Keys → Create API Key.

### 4. Run the chatbot

```bash
npm start
```

---

## Usage

```
╔══════════════════════════════════════╗
║   LangChain.js Chatbot  (Groq)       ║
║   Type 'exit' or 'quit' to stop      ║
╚══════════════════════════════════════╝

You: Hello! Who are you?

Bot: Hi there! I'm a helpful AI assistant. How can I help you today?

You: exit

Bot: Goodbye! 👋
```

**Commands:**

| Input | Action |
|-------|--------|
| Any text | Send message to the AI |
| `exit` / `quit` / `bye` | Exit the chatbot |
| `Ctrl+C` | Force quit |

---

## Code Walkthrough (`index.js`)

### 1. Imports

```js
import "dotenv/config";
```
Loads your `.env` file so `process.env.GROQ_API_KEY` is available throughout the app.

```js
import { ChatGroq } from "@langchain/groq";
```
The LangChain wrapper for Groq's API. Handles authentication, request formatting, and response parsing automatically.

```js
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
```
LangChain message classes. Each message has a **role** that tells the AI who sent it:
- `SystemMessage` — instructions/persona for the AI (set once at the start)
- `HumanMessage` — what the user typed
- `AIMessage` — what the AI replied

```js
import * as readline from "node:readline";
```
Node.js built-in module for reading input from the terminal line by line.

---

### 2. API Key Guard

```js
if (!process.env.GROQ_API_KEY) {
  console.error("Error: GROQ_API_KEY is not set.");
  process.exit(1);
}
```
Fails immediately at startup if the key is missing, rather than crashing mid-conversation.

---

### 3. Model Setup

```js
const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
});
```

| Parameter | What it does |
|-----------|-------------|
| `model` | Which AI model to use. `llama-3.3-70b-versatile` is Groq's best free model |
| `apiKey` | Your Groq API key, loaded from `.env` |
| `temperature` | Controls creativity. `0` = very predictable, `1` = very creative. `0.7` is a good balance |

---

### 4. Conversation Memory

```js
const MAX_PAIRS = 20;
const systemMessage = new SystemMessage("You are a helpful, friendly assistant...");
const chatHistory = [];
```

- `systemMessage` — Sent with every request to define the AI's behavior
- `chatHistory` — An array storing the conversation as alternating `HumanMessage` / `AIMessage` objects
- `MAX_PAIRS = 20` — Keeps only the last 20 exchanges to avoid hitting the model's token limit

---

### 5. The `chat()` Function

```js
async function chat(userInput) {
  chatHistory.push(new HumanMessage(userInput));        // 1. Add user message

  while (chatHistory.length > MAX_PAIRS * 2)            // 2. Trim old messages
    chatHistory.shift();

  const response = await model.invoke([systemMessage, ...chatHistory]); // 3. Call AI

  const text = typeof response.content === "string"     // 4. Extract text safely
    ? response.content
    : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");

  chatHistory.push(new AIMessage(text));                // 5. Save AI reply
  return text;
}
```

**Step by step:**
1. Wraps the user's text in a `HumanMessage` and adds it to history
2. Trims the history to the rolling window so it never grows too large
3. Calls `model.invoke()` — this is the actual API call to Groq
4. Safely extracts the text (response can be a string or an array of content blocks)
5. Saves the AI's reply as an `AIMessage` so the next turn has context

---

### 6. CLI Interface

```js
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
```
Creates a terminal interface for reading user input.

```js
process.on("SIGINT", () => { ... });
```
Handles `Ctrl+C` so the app exits cleanly instead of crashing with an error.

```js
function prompt() {
  rl.question("You: ", async (input) => { ... prompt(); });
}
```
Recursive function — after printing each response, it calls itself again to keep the conversation loop going.

---

## Available Models on Groq (Free)

Change the `model` value in `index.js` to switch models:

| Model | Best For |
|-------|----------|
| `llama-3.3-70b-versatile` | Best quality, general purpose (default) |
| `llama-3.1-8b-instant` | Fastest responses, lower quality |
| `mixtral-8x7b-32768` | Large 32k token context window |
| `gemma2-9b-it` | Google's Gemma model |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@langchain/groq` | LangChain integration for Groq API |
| `@langchain/core` | Core LangChain message types and interfaces |
| `langchain` | Main LangChain library |
| `dotenv` | Loads `.env` file into `process.env` |

---

## Learn More

- [LangChain.js Docs](https://js.langchain.com)
- [Groq Console](https://console.groq.com)
- [Project Guide](./guide.md) — Detailed LangChain concepts for beginners
