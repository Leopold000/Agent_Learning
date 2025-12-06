import readline from "node:readline";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { search, initDB } from "./rag_search.js";
import { executeTool, getToolDefinitions, checkServerHealth } from "./tools_client.js";

// 颜色
const C = {
  dim: "\x1b[2m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
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

// LLM配置 - 主模型（支持function calling）
const model = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0.7,
});

// 意图识别模型
const intentModel = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0.3,
});

// ================== 智能决策系统 ==================

// 通用问题分类
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

// 知识库关键词
const KNOWLEDGE_KEYWORDS = [
  "代码", "规范", "规则", "流程", "开发", "测试", "文档",
  "函数", "方法", "类", "模块", "系统", "架构",
  "定义", "说明", "解释", "介绍", "描述",
];

// 工具调用关键词
const TOOLS_KEYWORDS = {
  users: ["用户", "员工", "同事", "成员", "人员", "team", "staff"],
  projects: ["项目", "工程", "任务", "project", "task", "工作"],
  company: ["公司", "企业", "组织", "机构", "company", "organization"],
  calculations: ["计算", "算", "等于", "结果", "calculate", "compute"],
  conversions: ["转换", "换算", "温度", "长度", "货币", "convert", "exchange"],
  system: ["状态", "运行", "系统", "服务", "status", "system"],
};

// 判断问题类型
function analyzeQuestionType(query) {
  const queryLower = query.toLowerCase().trim();

  // 1. 检查是否是通用问题
  for (const [category, phrases] of Object.entries(GENERAL_QUESTIONS)) {
    for (const phrase of phrases) {
      if (queryLower.includes(phrase.toLowerCase())) {
        return { type: 'general', category, needsRetrieval: false, needsTools: false };
      }
    }
  }

  // 2. 检查是否需要工具调用
  const neededTools = [];
  for (const [toolCategory, keywords] of Object.entries(TOOLS_KEYWORDS)) {
    for (const keyword of keywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        neededTools.push(toolCategory);
        break;
      }
    }
  }

  if (neededTools.length > 0) {
    return {
      type: 'tools',
      tools: neededTools,
      needsRetrieval: false,
      needsTools: true
    };
  }

  // 3. 检查是否需要知识库检索
  for (const keyword of KNOWLEDGE_KEYWORDS) {
    if (queryLower.includes(keyword.toLowerCase())) {
      return { type: 'knowledge', needsRetrieval: true, needsTools: false };
    }
  }

  // 4. 默认：通用问题
  return { type: 'general', needsRetrieval: false, needsTools: false };
}

// 智能检索函数
async function intelligentRetrieve(query) {
  const analysis = analyzeQuestionType(query);

  console.log(C.cyan + "\n🤔 分析问题意图..." + C.reset);
  console.log(C.blue + `📊 分析结果: ${analysis.type}类型` + C.reset);

  if (analysis.type === 'tools') {
    console.log(C.blue + `🛠️  可能需要工具: ${analysis.tools.join(', ')}` + C.reset);
    return {
      type: 'tools',
      needsRetrieval: false,
      needsTools: true,
      suggestedTools: analysis.tools
    };
  }

  if (analysis.type === 'knowledge') {
    console.log(C.green + "🔍 判断为知识库问题，开始检索..." + C.reset);

    try {
      const results = await search(query, 3);
      const docList = results.length > 0
        ? results.map((r, idx) => `【${idx + 1}】${r.text.substring(0, 150)}...`).join("\n\n")
        : "（未检索到相关知识）";

      console.log(C.green + `✅ 检索完成，找到 ${results.length} 个相关文档` + C.reset);

      return {
        type: 'knowledge',
        needsRetrieval: true,
        needsTools: false,
        docs: docList,
        results: results
      };
    } catch (searchError) {
      console.error(C.magenta + "❌ 检索失败: " + searchError.message + C.reset);
      return {
        type: 'general',
        needsRetrieval: false,
        needsTools: false,
        docs: "（知识库检索失败）"
      };
    }
  }

  // 通用问题
  console.log(C.green + "✅ 判断为通用问题，直接回答" + C.reset);
  return {
    type: 'general',
    needsRetrieval: false,
    needsTools: false,
    docs: "（通用问题）"
  };
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

const toolsPrompt = ChatPromptTemplate.fromMessages([
  ["system", `你是一个AI助手，可以调用工具来获取信息或执行操作。

可用工具：
- get_users: 获取用户信息
- get_projects: 获取项目信息
- get_tasks: 获取任务信息
- get_company_info: 获取公司信息
- calculate: 执行数学计算
- convert_units: 单位转换
- get_system_status: 获取系统状态

请根据用户问题决定是否需要调用工具，如果需要，请使用正确的工具和参数。`],
  ["placeholder", "{history}"],
  ["human", "{input}"],
]);

// 创建对话链
const generalChain = RunnableSequence.from([generalPrompt, model]);
const ragChain = RunnableSequence.from([ragPrompt, model]);
const toolsChain = RunnableSequence.from([toolsPrompt, model]);

// 记忆管理
const store = new Map();

function getMessageHistory(sid) {
  if (!store.has(sid)) {
    store.set(sid, new InMemoryChatMessageHistory());
  }
  return store.get(sid);
}

const generalChat = new RunnableWithMessageHistory({
  runnable: generalChain,
  getMessageHistory,
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

const ragChat = new RunnableWithMessageHistory({
  runnable: ragChain,
  getMessageHistory,
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

const toolsChat = new RunnableWithMessageHistory({
  runnable: toolsChain,
  getMessageHistory,
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// ================== 工具调用处理 ==================

// 解析工具调用
function parseToolCall(response) {
  if (!response.content) return null;

  const content = response.content.toLowerCase();

  // 简单的关键词匹配（实际应该用更复杂的解析）
  const toolPatterns = [
    { tool: 'get_users', patterns: ['用户', '员工', '同事', '人员', '名单'] },
    { tool: 'get_projects', patterns: ['项目', '工程', '任务', '进度', '状态'] },
    { tool: 'get_tasks', patterns: ['任务', '待办', '工作', '分配'] },
    { tool: 'get_company_info', patterns: ['公司', '企业', '组织', '信息'] },
    { tool: 'calculate', patterns: ['计算', '等于', '结果', '算一下'] },
    { tool: 'convert_units', patterns: ['转换', '换算', '温度', '长度', '货币'] },
    { tool: 'get_system_status', patterns: ['状态', '运行', '系统', '服务'] },
  ];

  for (const { tool, patterns } of toolPatterns) {
    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        return {
          tool,
          parameters: extractParameters(content, tool)
        };
      }
    }
  }

  return null;
}

// 提取参数（简化版本）
function extractParameters(content, tool) {
  const params = {};

  switch (tool) {
    case 'get_users':
      // 尝试提取用户名或ID
      const nameMatch = content.match(/(?:查找|搜索|查询)(.+?)(?:的|信息|资料)/);
      if (nameMatch) params.searchName = nameMatch[1].trim();
      break;

    case 'calculate':
      // 提取数学表达式
      const calcMatch = content.match(/(?:计算|算一下)(.+?)(?:等于|结果|是多少)/);
      if (calcMatch) params.expression = calcMatch[1].trim();
      break;

    case 'convert_units':
      // 提取转换参数
      const convertMatch = content.match(/(?:把|将)?(\d+)(.+?)(?:转换|换算|换成)(.+)/);
      if (convertMatch) {
        params.value = parseFloat(convertMatch[1]);
        params.from = convertMatch[2].trim();
        params.to = convertMatch[3].trim();
      }
      break;
  }

  return params;
}

// 智能响应函数（整合RAG和Tools）
async function getIntelligentAIResponse(query, retrievalResult, sessionId) {
  const { type, needsRetrieval, needsTools, docs, suggestedTools } = retrievalResult;

  console.log(C.green + "🤖 AI：" + C.reset);

  try {
    if (needsTools) {
      // 工具调用模式
      console.log(C.blue + "🔧 进入工具调用模式..." + C.reset);

      const stream = await toolsChat.stream(
        { input: query },
        { configurable: { sessionId } }
      );

      let response = "";
      for await (const chunk of stream) {
        if (chunk?.content) {
          process.stdout.write(chunk.content);
          response += chunk.content;
        }
      }

      // 尝试解析工具调用
      const toolCall = parseToolCall({ content: response });
      if (toolCall) {
        console.log(`\n${C.cyan}🛠️  检测到工具调用: ${toolCall.tool}${C.reset}`);
        console.log(C.blue + `📋 参数: ${JSON.stringify(toolCall.parameters, null, 2)}` + C.reset);

        // 执行工具
        const toolResult = await executeTool(toolCall.tool, toolCall.parameters);

        if (toolResult.success) {
          console.log(C.green + `✅ 工具执行成功: ${toolResult.message}` + C.reset);
          console.log(C.cyan + `📊 结果概要:` + C.reset);

          if (Array.isArray(toolResult.data)) {
            console.log(`   数量: ${toolResult.count || toolResult.data.length}`);
            if (toolResult.data.length > 0) {
              console.log(`   示例: ${JSON.stringify(toolResult.data[0], null, 2)}`);
            }
          } else if (toolResult.data) {
            console.log(`   数据: ${JSON.stringify(toolResult.data, null, 2)}`);
          }

          // 基于工具结果生成最终回答
          console.log(`\n${C.green}🤖 AI总结:` + C.reset);
          const summary = await generateToolSummary(query, toolResult);
          console.log(summary);
        } else {
          console.log(C.red + `❌ 工具执行失败: ${toolResult.error || toolResult.message}` + C.reset);
        }
      }

      return response;
    } else if (needsRetrieval) {
      // RAG模式
      const stream = await ragChat.stream(
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

      return response;
    } else {
      // 通用模式
      const stream = await generalChat.stream(
        { input: query },
        { configurable: { sessionId } }
      );

      let response = "";
      for await (const chunk of stream) {
        if (chunk?.content) {
          process.stdout.write(chunk.content);
          response += chunk.content;
        }
      }

      return response;
    }
  } catch (error) {
    console.error(C.magenta + "❌ AI响应错误: " + error.message + C.reset);
    return null;
  }
}

// 生成工具结果总结
async function generateToolSummary(query, toolResult) {
  const summaryPrompt = ChatPromptTemplate.fromMessages([
    ["system", "你是一个AI助手，需要根据工具执行结果回答用户问题。"],
    ["human", `用户问题：${query}

工具执行结果：
${JSON.stringify(toolResult.data, null, 2)}

请基于以上结果，用自然语言回答用户的问题。`],
  ]);

  const summaryChain = RunnableSequence.from([summaryPrompt, model]);
  const response = await summaryChain.invoke({});

  return response.content || "无法生成总结";
}

// ================== 主程序 ==================

async function main() {
  console.log(C.cyan + "\n✨ 智能RAG助手（Tools版）启动！" + C.reset);
  line();

  console.log(C.blue + "🧠 特性：智能检索决策 + 工具调用 + 多轮对话 + 流式输出" + C.reset);
  console.log(C.blue + "🛠️  可用工具：用户查询、项目管理、公司信息、计算转换等" + C.reset);
  line();

  // 检查API服务器
  console.log("🔄 检查API服务器状态...");
  const serverStatus = await checkServerHealth();
  if (!serverStatus.available) {
    console.error(C.red + "❌ API服务器不可用！" + C.reset);
    console.log(C.yellow + "💡 请先启动API服务器：" + C.reset);
    console.log("   node api_server.js");
    console.log(C.yellow + "或跳过工具功能继续使用RAG：" + C.reset);
    console.log("   输入 'continue' 跳过工具检查");

    const userChoice = await askQuestion(C.yellow + "选择: " + C.reset);
    if (userChoice.toLowerCase() !== 'continue') {
      closeReadline();
      process.exit(1);
    }
  } else {
    console.log(C.green + `✅ API服务器可用 (${serverStatus.status})` + C.reset);
  }

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

  const sessionId = "rag-tools-session";

  console.log("\n💡 使用方法：");
  console.log("- 通用问题（问候、闲聊）：直接回答");
  console.log("- 知识问题（技术、规范）：检索知识库后回答");
  console.log("- 数据查询（用户、项目、公司）：调用工具获取信息");
  console.log("- 计算转换：调用计算和单位转换工具");
  console.log("- 输入 'clear' 重置对话记忆");
  console.log("- 输入 'tools' 查看可用工具");
  console.log("- 输入 'exit' 退出");
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

      if (inputLower === "tools") {
        console.log(C.cyan + "\n🛠️  可用工具列表：" + C.reset);
        const toolDefs = getToolDefinitions();
        toolDefs.forEach((def, index) => {
          console.log(`${index + 1}. ${def.function.name}: ${def.function.description}`);
        });
        line();
        continue;
      }

      // 智能检索决策
      const retrievalResult = await intelligentRetrieve(userInput);
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
    console.log(C.cyan + "\n🎉 感谢使用智能RAG助手（Tools版）！" + C.reset);
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