import readline from "node:readline";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { search, initDB } from "./rag_search.js";

// 颜色
const C = {
  dim: "\x1b[2m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m",
};

function line() {
  console.log(
    C.dim + "──────────────────────────────────────────────" + C.reset
  );
}

// LLM
const model = new ChatOllama({ model: "llama3.1:8b" });

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个 AI 助手，会根据知识库内容进行回答。"],
  ["placeholder", "{history}"],
  [
    "human",
    `用户问题：{input}
检索到的知识：
{docs}

请结合知识库内容回答用户问题。`,
  ],
]);

const chain = RunnableSequence.from([prompt, model]);

const store = new Map();
const chat = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sid) =>
    store.has(sid)
      ? store.get(sid)
      : store.set(sid, new InMemoryChatMessageHistory()).get(sid),
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error(C.magenta + "❌ 未捕获的异常:", error.message + C.reset);
  rl.close();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(C.magenta + "❌ 未处理的Promise拒绝:", reason + C.reset);
  rl.close();
  process.exit(1);
});

async function main() {
  try {
    await initDB();

    console.log(C.cyan + "\n✨ RAG增强AI助手启动！" + C.reset);
    line();

    const sessionId = "rag-session";

    while (true) {
      const userInput = await new Promise((res) =>
        rl.question(C.yellow + "🧑 你：" + C.reset, res)
      );

    if (["exit", "quit"].includes(userInput.toLowerCase())) {
      console.log(C.magenta + "👋 再见！" + C.reset);
      rl.close();
      break;
    }

    // 查询知识库
    let results = [];
    try {
      results = await search(userInput, 3);
    } catch (err) {
      console.error(C.magenta + "❌ 知识库查询失败:", err.message + C.reset);
    }

    const docList =
      results.length > 0
        ? results.map((r, idx) => `【${idx + 1}】${r.text}`).join("\n")
        : "（未检索到相关知识）";

    console.log(C.green + "🔍 检索结果：" + C.reset);
    console.log(docList);
    line();

    console.log(C.green + "🤖 AI：" + C.reset);

    const stream = await chat.stream(
      { input: userInput, docs: docList },
      { configurable: { sessionId } }
    );

    for await (const chunk of stream) {
      if (chunk?.content) process.stdout.write(chunk.content);
    }

    console.log("\n");
    line();
  }
  } catch (error) {
    console.error(C.magenta + "❌ 程序错误:", error.message + C.reset);
    console.error(error.stack);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main().catch(error => {
  console.error(C.magenta + "❌ 启动失败:", error.message + C.reset);
  process.exit(1);
});
