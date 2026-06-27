# LangChain Beginner's Guide

This guide explains LangChain concepts used in this project and introduces you to what LangChain can do beyond this chatbot.

---

## What is LangChain?

LangChain is a framework that makes it easier to build applications powered by AI language models (LLMs). Instead of manually writing API calls, handling message formats, and wiring everything together, LangChain gives you pre-built components that work together.

Think of it like this:
- **Without LangChain** — you write raw HTTP requests to OpenAI/Groq, manually format JSON, parse responses, manage conversation history yourself
- **With LangChain** — you use clean building blocks: `model.invoke()`, `HumanMessage`, `ChatPromptTemplate`, etc.

LangChain works with almost every major AI provider: OpenAI, Anthropic (Claude), Google Gemini, Groq, xAI, Mistral, and more. Switching between them is usually just one line of code.

---

## Core Concepts Used in This Project

### 1. Chat Models

A **Chat Model** is LangChain's wrapper around an AI provider's API.

```js
import { ChatGroq } from "@langchain/groq";

const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
});
```

Every chat model in LangChain works the same way — you call `.invoke()` with an array of messages and get a response back. This means if you wanted to switch from Groq to OpenAI tomorrow, you'd only change the import and the class name:

```js
// Groq
import { ChatGroq } from "@langchain/groq";
const model = new ChatGroq({ model: "llama-3.3-70b-versatile", ... });

// OpenAI (same .invoke() interface)
import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({ model: "gpt-4o", ... });

// Anthropic Claude (same .invoke() interface)
import { ChatAnthropic } from "@langchain/anthropic";
const model = new ChatAnthropic({ model: "claude-sonnet-4-6", ... });
```

**The `temperature` parameter:**
- `0.0` — Deterministic. Always gives the same answer. Good for factual/code tasks.
- `0.7` — Balanced. Slightly creative but still accurate. Good for general chat.
- `1.0` — Very creative. More varied, sometimes unexpected answers. Good for creative writing.

---

### 2. Messages

LangChain uses structured message objects instead of plain strings. Every message has a **role** that tells the AI who is speaking.

```js
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
```

| Class | Role | Used For |
|-------|------|----------|
| `SystemMessage` | `system` | Instructions and persona for the AI. Set once at the start. |
| `HumanMessage` | `user` | What the human typed. |
| `AIMessage` | `assistant` | What the AI replied. Stored in history for context. |

**Example conversation array:**
```js
[
  new SystemMessage("You are a helpful assistant."),
  new HumanMessage("What is 2 + 2?"),
  new AIMessage("2 + 2 equals 4."),
  new HumanMessage("What about 3 + 3?"),   // ← current question
]
```

The AI sees the entire array and understands the conversation flow. This is how it "remembers" previous messages.

---

### 3. model.invoke()

`.invoke()` is the core method that sends messages to the AI and gets a response.

```js
const response = await model.invoke([systemMessage, ...chatHistory]);
```

- Takes an **array of messages** as input
- Returns an **AIMessage** object
- `response.content` contains the text reply

```js
// response looks like:
{
  content: "Hello! I'm a helpful AI assistant.",
  role: "assistant",
  // ...other metadata
}
```

> **Why `await`?** The AI API call is asynchronous — it takes time to get a response over the internet. `await` pauses execution until the response arrives.

---

### 4. Conversation Memory (Manual)

In this project, memory is managed manually using a plain JavaScript array:

```js
const chatHistory = [];

// On each turn:
chatHistory.push(new HumanMessage(userInput));   // add user message
const response = await model.invoke([systemMessage, ...chatHistory]);
chatHistory.push(new AIMessage(responseText));   // add AI reply
```

**Why does this work?** Because the AI model itself is stateless — it doesn't remember previous conversations. By sending the full history on every call, we recreate the context each time.

**Rolling window to prevent token overflow:**
```js
const MAX_PAIRS = 20;
while (chatHistory.length > MAX_PAIRS * 2) chatHistory.shift();
```
AI models have a **token limit** (maximum text they can process at once). If you kept sending the entire history forever, you'd eventually hit this limit. Trimming old messages keeps things manageable.

---

## LangChain Concepts Beyond This Project

This chatbot uses the simplest possible setup. Here's what else LangChain can do:

---

### Prompt Templates

Instead of hardcoding messages, you can create reusable templates:

```js
import { ChatPromptTemplate } from "@langchain/core/prompts";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are an expert in {subject}. Answer in {language}."],
  ["human", "{question}"],
]);

const formatted = await prompt.formatMessages({
  subject: "JavaScript",
  language: "simple English",
  question: "What is a closure?",
});
```

Templates let you build dynamic prompts without string concatenation.

---

### Chains (Piping Steps Together)

LangChain lets you chain operations using the `|` pipe operator:

```js
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const chain = prompt | model | new StringOutputParser();

const result = await chain.invoke({
  subject: "Python",
  language: "English",
  question: "What is a list comprehension?",
});

console.log(result); // plain string, not a message object
```

This is called **LCEL (LangChain Expression Language)** — a clean way to compose pipelines.

---

### Output Parsers

By default, `model.invoke()` returns a message object. Output parsers convert it to something more useful:

```js
import { StringOutputParser } from "@langchain/core/output_parsers";
import { JsonOutputParser } from "@langchain/core/output_parsers";

// Get a plain string
const parser = new StringOutputParser();
const text = await parser.invoke(response);

// Get structured JSON (tell the AI to respond in JSON format)
const jsonParser = new JsonOutputParser();
const data = await jsonParser.invoke(response);
// data = { name: "Chirag", age: 25 }
```

---

### Tools / Function Calling

You can give the AI "tools" it can call — like searching the web, running calculations, or querying a database:

```js
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getWeather = tool(
  async ({ city }) => {
    return `The weather in ${city} is 28°C and sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the current weather for a city",
    schema: z.object({ city: z.string() }),
  }
);

const modelWithTools = model.bindTools([getWeather]);
```

When you ask "What's the weather in Mumbai?", the AI will call your `getWeather` function and use the result in its answer.

---

### RAG (Retrieval-Augmented Generation)

RAG lets the AI answer questions about **your own documents** (PDFs, websites, databases):

```
Your PDF → Split into chunks → Store in vector database
                                         ↓
User question → Find relevant chunks → Send to AI with context → Answer
```

Key components:
- **Document Loaders** — Load PDFs, websites, CSVs, etc.
- **Text Splitters** — Break documents into smaller chunks
- **Embeddings** — Convert text to numbers for similarity search
- **Vector Stores** — Database that stores and searches embeddings
- **Retrievers** — Find the most relevant chunks for a question

---

### Agents

Agents let the AI **decide what to do next** — it can use tools, check results, and take multiple steps to complete a task:

```
User: "Find the latest news about LangChain and summarize it"

Agent thinks:
  Step 1 → Use search tool → gets search results
  Step 2 → Read the top 3 articles
  Step 3 → Summarize findings → reply to user
```

This is more powerful than a simple chain because the AI can handle unexpected situations and loop until the task is done.

---

## Learning Path (Recommended Order)

If you want to go deeper with LangChain after this project:

```
1. This project          ← You are here
        ↓
2. Prompt Templates      ← Make dynamic, reusable prompts
        ↓
3. LCEL Chains           ← Pipe steps together cleanly
        ↓
4. Output Parsers        ← Get structured data from AI
        ↓
5. Tools                 ← Give AI the ability to call functions
        ↓
6. RAG                   ← Let AI answer from your own documents
        ↓
7. Agents                ← Let AI plan and execute multi-step tasks
        ↓
8. LangGraph             ← Build complex stateful AI workflows
```

---

## Key Terms Glossary

| Term | Meaning |
|------|---------|
| **LLM** | Large Language Model — the AI brain (GPT-4, Llama, Claude, etc.) |
| **Token** | A chunk of text (~4 characters). Models have a max token limit. |
| **Context window** | Max tokens a model can process at once (input + output combined) |
| **Temperature** | Controls randomness of AI responses (0 = focused, 1 = creative) |
| **Prompt** | The input/instructions you send to an AI model |
| **System prompt** | Special instructions that define the AI's role and behavior |
| **Embedding** | A list of numbers that represents the meaning of text |
| **Vector store** | A database optimized for similarity search on embeddings |
| **RAG** | Retrieval-Augmented Generation — AI + your own data |
| **Agent** | AI that can use tools and make decisions to complete tasks |
| **Chain** | A sequence of steps piped together (prompt → model → parser) |
| **LCEL** | LangChain Expression Language — the `|` pipe syntax for chains |
| **Inference** | The process of running an AI model to get a response |

---

## Useful Links

| Resource | URL |
|----------|-----|
| LangChain.js Documentation | https://js.langchain.com |
| LangChain.js GitHub | https://github.com/langchain-ai/langchainjs |
| Groq Console (free API) | https://console.groq.com |
| Groq Supported Models | https://console.groq.com/docs/models |
| LangChain Tutorials | https://js.langchain.com/docs/tutorials |
| LangSmith (debugging) | https://smith.langchain.com |
