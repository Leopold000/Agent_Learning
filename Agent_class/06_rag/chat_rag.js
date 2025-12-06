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

// 创建readline接口（单例模式）
let rl = null;

function createReadline() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

function closeReadline() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

async function askQuestion(question) {
  const rlInstance = createReadline();
  return new Promise((resolve) => {
    rlInstance.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// LLM配置
const model = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0.7,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个 AI 助手，会根据知识库内容进行回答。"],
  ["placeholder", "{history}"],
  [
    "human",
    `用户问题：{input}
检索到的知识：
{docs}

请结合知识库内容回答用户问题。如果知识库中没有相关信息，请如实说明。`,
  ],
]);

const chain = RunnableSequence.from([prompt, model]);

// 记忆管理
const store = new Map();
const chat = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sid) => {
    if (!store.has(sid)) {
      store.set(sid, new InMemoryChatMessageHistory());
    }
    return store.get(sid);
  },
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// LLM流式响应（带超时）
async function getAIResponse(query, docs, sessionId) {
  console.log(C.green + "🤖 AI：" + C.reset);

  try {
    const stream = await chat.stream(
      { input: query, docs: docs },
      { configurable: { sessionId } }
    );

    let response = "";
    for await (const chunk of stream) {
      if (chunk?.content) {
        process.stdout.write(chunk.content);
        response += chunk.content;
      }
    }

    if (response.length === 0) {
      console.log("（AI没有生成响应，可能是ollama服务问题）");
    }

    return response;
  } catch (error) {
    console.error(C.magenta + "❌ AI响应错误: " + error.message + C.reset);
    console.log("请检查ollama服务是否运行: ollama serve");
    console.log("或下载模型: ollama pull llama3.1:8b");
    return null;
  }
}

async function main() {
  console.log(C.cyan + "\n✨ RAG增强AI助手启动！" + C.reset);
  line();

  try {
    console.log("正在加载知识库...");
    await initDB();
    console.log("✅ 知识库加载成功");
  } catch (error) {
    console.error(C.magenta + "❌ 知识库加载失败: " + error.message + C.reset);
    console.log("请先运行 embed.js 构建知识库");
    closeReadline();
    process.exit(1);
  }

  const sessionId = "rag-session";
  console.log("会话ID:", sessionId);
  console.log("支持多轮对话、流式输出和记忆功能");
  line();

  try {
    while (true) {
      const userInput = await askQuestion(C.yellow + "🧑 你：" + C.reset);

      if (!userInput || userInput.trim() === "") {
        continue;
      }

      const inputLower = userInput.toLowerCase().trim();
      if (["exit", "quit", "退出", "bye", "再见"].includes(inputLower)) {
        console.log(C.magenta + "\n👋 再见！" + C.reset);
        break;
      }

      if (["clear", "重置", "reset"].includes(inputLower)) {
        store.delete(sessionId);
        console.log(C.cyan + "🧹 对话记忆已重置" + C.reset);
        line();
        continue;
      }

      // 检索知识库
      let results = [];
      try {
        results = await search(userInput, 3);
      } catch (searchError) {
        console.error(C.magenta + "❌ 检索失败: " + searchError.message + C.reset);
        line();
        continue;
      }

      // 格式化检索结果
      const docList =
        results.length > 0
          ? results.map((r, idx) => `【${idx + 1}】${r.text.substring(0, 150)}...`).join("\n\n")
          : "（未检索到相关知识）";

      console.log(C.green + "🔍 检索结果：" + C.reset);
      console.log(docList);
      line();

      // 获取AI响应
      await getAIResponse(userInput, docList, sessionId);

      console.log("\n");
      line();
    }
  } catch (error) {
    console.error(C.magenta + "\n❌ 程序错误: " + error.message + C.reset);
    console.error(error.stack);
  } finally {
    closeReadline();
    console.log(C.cyan + "\n🎉 感谢使用RAG增强AI助手！" + C.reset);
  }
}

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error(C.magenta + "\n❌ 未捕获异常: " + error.message + C.reset);
  closeReadline();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(C.magenta + "\n❌ 未处理拒绝: " + reason + C.reset);
  closeReadline();
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log(C.magenta + "\n\n👋 收到中断信号，正在退出..." + C.reset);
  closeReadline();
  process.exit(0);
});

main().catch(error => {
  console.error(C.magenta + "❌ 启动失败: " + error.message + C.reset);
  closeReadline();
  process.exit(1);
});