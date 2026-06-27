import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import * as readline from "node:readline";

// ── Fail fast if API key is missing ──────────────────────────────────────────
if (!process.env.GROQ_API_KEY) {
  console.error("Error: GROQ_API_KEY is not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}

// ── Model setup ───────────────────────────────────────────────────────────────
const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",  // or "mixtral-8x7b-32768" for larger context
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
});

// Keep a rolling window: 1 system message + last MAX_PAIRS exchanges
const MAX_PAIRS = 20;
const systemMessage = new SystemMessage(
  "You are a helpful, friendly assistant. Keep answers concise and clear."
);
const chatHistory = [];

// ── Chat function ─────────────────────────────────────────────────────────────
async function chat(userInput) {
  chatHistory.push(new HumanMessage(userInput));

  // Trim to rolling window (human+AI pairs)
  while (chatHistory.length > MAX_PAIRS * 2) chatHistory.shift();

  const response = await model.invoke([systemMessage, ...chatHistory]);

  const text = typeof response.content === "string"
    ? response.content
    : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");

  chatHistory.push(new AIMessage(text));
  return text;
}

// ── CLI interface ─────────────────────────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("╔══════════════════════════════════════╗");
console.log("║   LangChain.js Chatbot  (xAI Grok)   ║");
console.log("║   Type 'exit' or 'quit' to stop      ║");
console.log("╚══════════════════════════════════════╝\n");

process.on("SIGINT", () => {
  console.log("\nBot: Goodbye! 👋");
  rl.close();
  process.exit(0);
});

function prompt() {
  rl.question("You: ", async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      prompt();
      return;
    }

    if (["exit", "quit", "bye"].includes(trimmed.toLowerCase())) {
      console.log("\nBot: Goodbye! 👋");
      rl.close();
      return;
    }

    try {
      const reply = await chat(trimmed);
      console.log(`\nBot: ${reply}\n`);
    } catch (err) {
      console.error(`\nError: ${err.message}\n`);
    }

    prompt();
  });
}

prompt();
