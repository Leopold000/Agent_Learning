// 04_terminal_chat.js
// 终端聊天+流式输出+多轮对话+记忆
import readline from "node:readline";
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
  ["system", "你是一个友好的 AI 助手，回答要简洁、有礼貌。"],
  ["placeholder", "{history}"],
  ["human", "{input}"],
]);

// 3. 构建基础 chain
const chain = RunnableSequence.from([prompt, model]);

// 4. memory 管理
const sessionStore = new Map();
const chat = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sessionId) => {
    if (!sessionStore.has(sessionId)) {
      sessionStore.set(sessionId, new InMemoryChatMessageHistory());
    }
    return sessionStore.get(sessionId);
  },
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// 5. readline 实时接收用户输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 包装成 async 函数
async function main() {
  console.log("🟢 多轮对话助手已启动（输入 exit/quit 退出）\n");

  while (true) {
    // 等待用户输入
    const userInput = await new Promise((resolve) =>
      rl.question("你：", resolve)
    );

    // 退出条件
    if (["exit", "quit"].includes(userInput.toLowerCase())) {
      console.log("👋 已退出聊天助手，再见！");
      process.exit(0);
    }

    // 开始流式输出
    const stream = await chat.stream(
      { input: userInput },
      { configurable: { sessionId: "default-session" } }
    );

    process.stdout.write("🤖："); // 提示

    for await (const chunk of stream) {
      if (chunk?.content) process.stdout.write(chunk.content);
    }

    console.log("\n"); // 换行
  }
}

// 运行
main();
