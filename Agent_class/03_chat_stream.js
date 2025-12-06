// 03_chat_stream.js
// 聊天流式输出
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";

// 1. 本地模型
const model = new ChatOllama({
  model: "llama3.1:8b",
  baseUrl: "http://localhost:11434",
});

// 2. prompt
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个优秀的 AI 助手。"],
  ["placeholder", "{history}"],
  ["human", "{input}"],
]);

// 3. 主 chain
const chain = RunnableSequence.from([prompt, model]);

// 4. memory
const store = new Map();
const withMemory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sessionId) => {
    if (!store.has(sessionId)) {
      store.set(sessionId, new InMemoryChatMessageHistory());
    }
    return store.get(sessionId);
  },
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// 5. 多轮 + 流式输出
async function askStream(text) {
  const stream = await withMemory.stream(
    { input: text },
    { configurable: { sessionId: "session1" } }
  );

  console.log("\nAI: ");
  for await (const chunk of stream) {
    if (chunk?.content) {
      process.stdout.write(chunk.content);
    }
  }
  console.log("\n");
}

// 🔥 测试多轮对话 + 流式输出
await askStream("你好，我叫小蔡。");
await askStream("我刚才说我叫什么？");
await askStream("我适合学编程吗？");
