// 05_terminal_chat_ui.js
import readline from "node:readline";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";

// 终端颜色（不依赖第三方库）
const color = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  green: "\x1b[32m",
};

// 小组件：分隔线
function line() {
  console.log(
    color.dim + "──────────────────────────────────────────────" + color.reset
  );
}

// 1. 本地 Llama3.1
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

// 3. 构建 chain
const chain = RunnableSequence.from([prompt, model]);

// 4. memory
const store = new Map();
const chat = new RunnableWithMessageHistory({
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

// 5. readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 主函数
async function main() {
  console.log(
    "\n" +
      color.cyan +
      "✨ AI 对话助手已启动！(输入 exit / quit 退出)" +
      color.reset
  );
  line();

  while (true) {
    const userInput = await new Promise((resolve) =>
      rl.question(color.yellow + "🧑 你：" + color.reset, resolve)
    );

    // 退出
    if (["exit", "quit"].includes(userInput.toLowerCase())) {
      console.log(color.magenta + "\n👋 已退出聊天助手，再见！" + color.reset);
      process.exit(0);
    }

    // 输出助手标识
    console.log(color.green + "🤖 AI：" + color.reset);

    // 流式输出
    const stream = await chat.stream(
      { input: userInput },
      { configurable: { sessionId: "session1" } }
    );

    for await (const chunk of stream) {
      if (chunk?.content) process.stdout.write(chunk.content);
    }

    console.log("\n");
    line();
  }
}

main();
