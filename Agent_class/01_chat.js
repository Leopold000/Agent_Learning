// 带记忆的多轮对话助手
// 01_chat.js
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

// 2. prompt 模板
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个友好的 AI 助手。"],
  ["placeholder", "{history}"],
  ["human", "{input}"],
]);

// 3. 组装主 chain
const chain = RunnableSequence.from([prompt, model]);

// 4. Memory：基于 ChatHistory
const store = new Map();
const withMemory = new RunnableWithMessageHistory({
  runnable: chain,
  // sessionId: 用于区分多个用户（这里固定一个）
  getMessageHistory: (sessionId) => {
    if (!store.has(sessionId)) {
      store.set(sessionId, new InMemoryChatMessageHistory());
    }
    return store.get(sessionId);
  },
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// 5. 便捷函数
async function ask(text) {
  const res = await withMemory.invoke(
    { input: text },
    { configurable: { sessionId: "user-session-1" } }
  );
  console.log("\nAI:", res.content);
}

// 测试多轮对话
await ask("你好，我叫小蔡。");
await ask("我刚才说我叫什么？");
await ask("你觉得我适合学编程吗？");
