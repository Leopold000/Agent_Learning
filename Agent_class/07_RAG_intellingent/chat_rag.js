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
  blue: "\x1b[34m",
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

// LLM配置 - 主模型
const model = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0.7,
});

// 意图识别模型（可以使用同一个模型）
const intentModel = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0.3,  // 更低的temperature以获得更稳定的分类
});

// ================== 智能检索决策系统 ==================

// 通用问题分类（不需要检索的问题）
const GENERAL_QUESTIONS = {
  greetings: ["你好", "hi", "hello", "嗨", "早上好", "下午好", "晚上好", "hey"],
  farewells: ["再见", "拜拜", "bye", "goodbye", "see you"],
  thanks: ["谢谢", "thanks", "thank you", "thx"],
  smalltalk: ["你好吗", "how are you", "最近怎么样", "what's up"],
  system: ["你是谁", "你是什么", "what are you", "who are you"],
  capabilities: ["你能做什么", "what can you do", "你的功能", "你的能力"],
  time: ["现在几点", "what time is it", "今天星期几", "几号"],
  weather: ["天气", "weather", "下雨", "sunny"],
  math: ["计算", "calculate", "算一下", "1+1", "数学"],
};

// 知识库相关关键词（需要检索的问题）
const KNOWLEDGE_KEYWORDS = [
  "代码", "规范", "规则", "流程", "开发", "测试", "文档",
  "函数", "方法", "类", "模块", "系统", "架构",
  "如何", "怎样", "为什么", "原因", "解决方案", "建议",
  "公司", "项目", "产品", "服务", "技术",
  "定义", "说明", "解释", "介绍", "描述",
];

// 判断是否需要检索知识库
function shouldRetrieveKnowledge(query) {
  const queryLower = query.toLowerCase().trim();

  // 1. 检查是否是通用问题（不需要检索）
  for (const [category, phrases] of Object.entries(GENERAL_QUESTIONS)) {
    for (const phrase of phrases) {
      if (queryLower.includes(phrase.toLowerCase())) {
        console.log(C.blue + `📋 分类: ${category} - 不需要检索` + C.reset);
        return false;
      }
    }
  }

  // 2. 检查是否包含知识库关键词（需要检索）
  for (const keyword of KNOWLEDGE_KEYWORDS) {
    if (queryLower.includes(keyword.toLowerCase())) {
      console.log(C.blue + `🔑 检测到关键词: "${keyword}" - 需要检索` + C.reset);
      return true;
    }
  }

  // 3. 基于问题长度和结构判断
  const words = queryLower.split(/\s+/).length;
  if (words <= 3) {
    // 简短问题通常是通用问题
    console.log(C.blue + `📏 简短问题(${words}词) - 不需要检索` + C.reset);
    return false;
  }

  // 4. 检查是否是疑问句（需要更多信息）
  const questionWords = ["什么", "怎么", "如何", "为什么", "何时", "哪里", "谁", "哪些"];
  const hasQuestionWord = questionWords.some(word => queryLower.includes(word));

  if (hasQuestionWord) {
    console.log(C.blue + `❓ 疑问句 - 需要检索` + C.reset);
    return true;
  }

  // 5. 默认情况：对于中等长度的问题，使用检索
  console.log(C.blue + `⚖️ 中等长度问题(${words}词) - 默认检索` + C.reset);
  return true;
}

// 使用LLM进行意图识别（更准确但稍慢）
async function analyzeIntentWithLLM(query) {
  try {
    const intentPrompt = ChatPromptTemplate.fromMessages([
      ["system", `你是一个意图分类器。请分析用户问题是否需要检索知识库来回答。

知识库内容：公司开发规范、代码示例、技术文档等。

请用以下格式回答：
{"needs_retrieval": true/false, "reason": "原因说明"}`],
      ["human", `用户问题：${query}`],
    ]);

    const intentChain = RunnableSequence.from([intentPrompt, intentModel]);
    const response = await intentChain.invoke({});

    try {
      // 尝试解析JSON响应
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intent = JSON.parse(jsonMatch[0]);
        console.log(C.blue + `🧠 LLM分析: ${intent.reason}` + C.reset);
        return intent.needs_retrieval;
      }
    } catch (e) {
      // 如果JSON解析失败，回退到基于规则的方法
      console.log(C.blue + `⚠️ LLM响应格式异常，使用规则判断` + C.reset);
    }
  } catch (error) {
    console.log(C.blue + `⚠️ LLM意图分析失败: ${error.message}` + C.reset);
  }

  // 回退到基于规则的方法
  return shouldRetrieveKnowledge(query);
}

// ================== 智能检索系统 ==================

// 智能检索函数
async function intelligentRetrieve(query, useLLM = false) {
  console.log(C.cyan + "\n🤔 分析问题意图..." + C.reset);

  let needsRetrieval;
  if (useLLM) {
    needsRetrieval = await analyzeIntentWithLLM(query);
  } else {
    needsRetrieval = shouldRetrieveKnowledge(query);
  }

  if (!needsRetrieval) {
    console.log(C.green + "✅ 判断为通用问题，无需检索知识库" + C.reset);
    return {
      needsRetrieval: false,
      docs: "（当前问题为通用问题，直接回答）",
      results: []
    };
  }

  console.log(C.green + "🔍 判断为专业问题，开始检索知识库..." + C.reset);

  try {
    const results = await search(query, 3);
    const docList = results.length > 0
      ? results.map((r, idx) => `【${idx + 1}】${r.text.substring(0, 150)}...`).join("\n\n")
      : "（未检索到相关知识）";

    console.log(C.green + `✅ 检索完成，找到 ${results.length} 个相关文档` + C.reset);

    return {
      needsRetrieval: true,
      docs: docList,
      results: results
    };
  } catch (searchError) {
    console.error(C.magenta + "❌ 检索失败: " + searchError.message + C.reset);
    return {
      needsRetrieval: false,
      docs: "（知识库检索失败，将基于通用知识回答）",
      results: []
    };
  }
}

// ================== 对话系统 ==================

// 不同的提示模板
const generalPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个友好的AI助手，回答通用问题。"],
  ["placeholder", "{history}"],
  ["human", "{input}"],
]);

const ragPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个AI助手，会根据知识库内容进行回答。"],
  ["placeholder", "{history}"],
  [
    "human",
    `用户问题：{input}
检索到的知识：
{docs}

请结合知识库内容回答用户问题。如果知识库中没有相关信息，请基于你的知识回答。`,
  ],
]);

// 创建两个对话链
const generalChain = RunnableSequence.from([generalPrompt, model]);
const ragChain = RunnableSequence.from([ragPrompt, model]);

// 记忆管理
const store = new Map();
const generalChat = new RunnableWithMessageHistory({
  runnable: generalChain,
  getMessageHistory: (sid) => {
    if (!store.has(sid)) {
      store.set(sid, new InMemoryChatMessageHistory());
    }
    return store.get(sid);
  },
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

const ragChat = new RunnableWithMessageHistory({
  runnable: ragChain,
  getMessageHistory: (sid) => {
    if (!store.has(sid)) {
      store.set(sid, new InMemoryChatMessageHistory());
    }
    return store.get(sid);
  },
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// 智能响应函数
async function getIntelligentAIResponse(query, retrievalResult, sessionId) {
  const { needsRetrieval, docs } = retrievalResult;

  console.log(C.green + "🤖 AI：" + C.reset);

  try {
    let stream;

    if (needsRetrieval) {
      // 使用RAG链（有知识库）
      stream = await ragChat.stream(
        { input: query, docs: docs },
        { configurable: { sessionId } }
      );
    } else {
      // 使用通用链（无知识库）
      stream = await generalChat.stream(
        { input: query },
        { configurable: { sessionId } }
      );
    }

    let response = "";
    for await (const chunk of stream) {
      if (chunk?.content) {
        process.stdout.write(chunk.content);
        response += chunk.content;
      }
    }

    if (response.length === 0) {
      console.log("（AI没有生成响应）");
    }

    return response;
  } catch (error) {
    console.error(C.magenta + "❌ AI响应错误: " + error.message + C.reset);
    return null;
  }
}

// ================== 主程序 ==================

async function main() {
  console.log(C.cyan + "\n✨ 智能RAG助手启动！" + C.reset);
  line();

  console.log(C.blue + "🧠 特性：智能检索决策 + 多轮对话 + 流式输出" + C.reset);
  console.log(C.blue + "📊 模式：混合（规则 + LLM意图分析）" + C.reset);
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
  let useLLMIntent = false; // 默认使用规则判断，可以动态切换

  console.log("\n💡 使用方法：");
  console.log("- 通用问题（问候、闲聊）：直接回答");
  console.log("- 专业问题（技术、规范）：检索知识库后回答");
  console.log("- 输入 'mode llm' 切换为LLM意图分析");
  console.log("- 输入 'mode rule' 切换为规则判断");
  line();

  try {
    while (true) {
      const userInput = await askQuestion(C.yellow + "🧑 你：" + C.reset);

      if (!userInput || userInput.trim() === "") {
        continue;
      }

      const inputLower = userInput.toLowerCase().trim();

      // 系统命令
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

      // 模式切换
      if (inputLower === "mode llm") {
        useLLMIntent = true;
        console.log(C.cyan + "🔄 切换到LLM意图分析模式" + C.reset);
        line();
        continue;
      }

      if (inputLower === "mode rule") {
        useLLMIntent = false;
        console.log(C.cyan + "🔄 切换到规则判断模式" + C.reset);
        line();
        continue;
      }

      // 智能检索决策
      const retrievalResult = await intelligentRetrieve(userInput, useLLMIntent);
      line();

      // 获取AI响应
      await getIntelligentAIResponse(userInput, retrievalResult, sessionId);

      console.log("\n");
      line();
    }
  } catch (error) {
    console.error(C.magenta + "\n❌ 程序错误: " + error.message + C.reset);
    console.error(error.stack);
  } finally {
    closeReadline();
    console.log(C.cyan + "\n🎉 感谢使用智能RAG助手！" + C.reset);
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