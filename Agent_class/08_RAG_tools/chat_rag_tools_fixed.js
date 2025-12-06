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

// 创建readline接口
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

// 意图识别模型
const intentModel = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0.3,
});

// ================== 智能意图识别 ==================

// 使用LLM进行真正的意图识别
async function intelligentIntentRecognition(query) {
  console.log(C.cyan + "\n🤔 使用LLM进行智能意图识别..." + C.reset);

  try {
    // 获取知识库示例内容
    let knowledgeExamples = "";
    try {
      const sampleResults = await search("规范 代码 开发", 2);
      knowledgeExamples = sampleResults.map(r =>
        `示例: ${r.text.substring(0, 100)}...`
      ).join('\n');
    } catch (e) {
      knowledgeExamples = "知识库包含：公司开发规范、代码示例、技术文档等";
    }

    // 获取工具描述
    const toolDefs = getToolDefinitions();
    const toolsDescription = toolDefs.map(t =>
      `- ${t.function.name}: ${t.function.description}`
    ).join('\n');

    const intentPrompt = ChatPromptTemplate.fromMessages([
      ["system", `你是一个智能意图识别系统。请分析用户问题，判断最适合的处理方式。

背景信息：
1. 知识库内容：${knowledgeExamples}
2. 可用工具：
${toolsDescription}

决策标准：
- 如果问题涉及公司内部规范、技术文档、代码示例、开发流程等专业知识 → 需要检索知识库
- 如果问题涉及查询数据（用户、项目、任务、公司信息）或执行操作（计算、转换） → 需要调用工具
- 如果只是问候、闲聊、简单问答、通用问题 → 直接回答

请分析用户问题，并返回JSON格式的结果：
{
  "action": "general" | "knowledge" | "tools",
  "reason": "简要说明决策理由",
  "confidence": 0.0-1.0,
  "suggested_tool": "工具名称或null",
  "tool_parameters": "建议的参数或null"
}`],
      ["human", `用户问题：${query}`],
    ]);

    const intentChain = RunnableSequence.from([intentPrompt, intentModel]);
    const response = await intentChain.invoke({});

    // 尝试解析JSON
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intent = JSON.parse(jsonMatch[0]);

        console.log(C.blue + `🧠 LLM分析:` + C.reset);
        console.log(C.blue + `   决策: ${intent.action}` + C.reset);
        console.log(C.blue + `   理由: ${intent.reason}` + C.reset);
        console.log(C.blue + `   置信度: ${(intent.confidence * 100).toFixed(1)}%` + C.reset);

        if (intent.action === 'tools' && intent.suggested_tool) {
          console.log(C.blue + `   建议工具: ${intent.suggested_tool}` + C.reset);
        }

        return intent;
      }
    } catch (e) {
      console.log(C.magenta + `⚠️ JSON解析失败，使用文本分析` + C.reset);
      return analyzeIntentFromText(response.content, query);
    }
  } catch (error) {
    console.log(C.magenta + `❌ 意图识别失败: ${error.message}` + C.reset);
    return fallbackIntentRecognition(query);
  }

  return fallbackIntentRecognition(query);
}

// 从文本响应分析意图
function analyzeIntentFromText(text, query) {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let action = 'general';
  let suggested_tool = null;
  let reason = '基于响应文本分析';

  if (textLower.includes('知识库') || textLower.includes('检索') ||
      textLower.includes('规范') || textLower.includes('文档')) {
    action = 'knowledge';
  } else if (textLower.includes('工具') || textLower.includes('调用') ||
             textLower.includes('查询') || textLower.includes('计算')) {
    action = 'tools';

    // 尝试猜测工具
    if (queryLower.includes('用户') || queryLower.includes('员工')) {
      suggested_tool = 'get_users';
    } else if (queryLower.includes('项目')) {
      suggested_tool = 'get_projects';
    } else if (queryLower.includes('任务')) {
      suggested_tool = 'get_tasks';
    } else if (queryLower.includes('公司')) {
      suggested_tool = 'get_company_info';
    } else if (queryLower.includes('计算')) {
      suggested_tool = 'calculate';
    } else if (queryLower.includes('转换')) {
      suggested_tool = 'convert_units';
    }
  }

  return {
    action,
    reason,
    confidence: 0.7,
    suggested_tool,
    tool_parameters: null
  };
}

// 回退意图识别
function fallbackIntentRecognition(query) {
  const queryLower = query.toLowerCase();

  // 知识库关键词
  const knowledgeKeywords = [
    "代码", "规范", "规则", "流程", "开发", "测试", "文档",
    "函数", "方法", "类", "模块", "系统", "架构", "如何做",
    "怎样", "为什么", "原因", "解决方案", "建议", "定义",
    "说明", "解释", "介绍", "描述"
  ];

  // 工具关键词
  const toolKeywords = [
    { keyword: "用户", tool: "get_users" },
    { keyword: "员工", tool: "get_users" },
    { keyword: "同事", tool: "get_users" },
    { keyword: "人员", tool: "get_users" },
    { keyword: "名单", tool: "get_users" },
    { keyword: "项目", tool: "get_projects" },
    { keyword: "工程", tool: "get_projects" },
    { keyword: "进度", tool: "get_projects" },
    { keyword: "任务", tool: "get_tasks" },
    { keyword: "待办", tool: "get_tasks" },
    { keyword: "工作", tool: "get_tasks" },
    { keyword: "分配", tool: "get_tasks" },
    { keyword: "公司", tool: "get_company_info" },
    { keyword: "企业", tool: "get_company_info" },
    { keyword: "组织", tool: "get_company_info" },
    { keyword: "计算", tool: "calculate" },
    { keyword: "算", tool: "calculate" },
    { keyword: "等于", tool: "calculate" },
    { keyword: "结果", tool: "calculate" },
    { keyword: "转换", tool: "convert_units" },
    { keyword: "换算", tool: "convert_units" },
    { keyword: "温度", tool: "convert_units" },
    { keyword: "长度", tool: "convert_units" },
    { keyword: "货币", tool: "convert_units" },
    { keyword: "状态", tool: "get_system_status" },
    { keyword: "运行", tool: "get_system_status" },
    { keyword: "系统", tool: "get_system_status" }
  ];

  // 检查知识库关键词
  for (const keyword of knowledgeKeywords) {
    if (queryLower.includes(keyword)) {
      return {
        action: 'knowledge',
        reason: `检测到关键词: ${keyword}`,
        confidence: 0.8,
        suggested_tool: null,
        tool_parameters: null
      };
    }
  }

  // 检查工具关键词
  for (const { keyword, tool } of toolKeywords) {
    if (queryLower.includes(keyword)) {
      return {
        action: 'tools',
        reason: `检测到工具关键词: ${keyword}`,
        confidence: 0.8,
        suggested_tool: tool,
        tool_parameters: null
      };
    }
  }

  // 默认通用问题
  return {
    action: 'general',
    reason: '未检测到特定关键词，按通用问题处理',
    confidence: 0.6,
    suggested_tool: null,
    tool_parameters: null
  };
}

// ================== 知识库检索 ==================

async function retrieveKnowledge(query) {
  console.log(C.green + "🔍 开始检索知识库..." + C.reset);

  try {
    const results = await search(query, 3);
    const docList = results.length > 0
      ? results.map((r, idx) => `【${idx + 1}】${r.text.substring(0, 150)}...`).join("\n\n")
      : "（未检索到相关知识）";

    console.log(C.green + `✅ 检索完成，找到 ${results.length} 个相关文档` + C.reset);

    return {
      success: true,
      docs: docList,
      results: results
    };
  } catch (error) {
    console.error(C.magenta + "❌ 检索失败: " + error.message + C.reset);
    return {
      success: false,
      docs: "（知识库检索失败）",
      results: []
    };
  }
}

// ================== 工具调用处理 ==================

// 智能参数提取
async function extractToolParameters(query, toolName) {
  console.log(C.cyan + `🔧 提取工具参数: ${toolName}` + C.reset);

  const toolDefs = getToolDefinitions();
  const toolDef = toolDefs.find(t => t.function.name === toolName);

  if (!toolDef) {
    console.log(C.magenta + `❌ 工具未找到: ${toolName}` + C.reset);
    return {};
  }

  // 简单参数提取规则
  const params = {};
  const queryLower = query.toLowerCase();

  switch (toolName) {
    case 'get_users':
      // 提取用户名或ID
      const nameMatch = query.match(/(?:查询|查找|搜索|查看|显示|列出)(.+?)(?:的|信息|资料|情况|列表|名单|$)/);
      if (nameMatch && nameMatch[1].trim().length > 1) {
        params.searchName = nameMatch[1].trim();
      }
      break;

    case 'get_projects':
      if (queryLower.includes('进行中') || queryLower.includes('正在做') || queryLower.includes('当前项目')) {
        params.status = '进行中';
      } else if (queryLower.includes('已完成') || queryLower.includes('完成')) {
        params.status = '已完成';
      } else if (queryLower.includes('计划中') || queryLower.includes('计划') || queryLower.includes('待开始')) {
        params.status = '计划中';
      }
      break;

    case 'get_tasks':
      if (queryLower.includes('高优先级') || queryLower.includes('重要')) {
        params.priority = '高';
      } else if (queryLower.includes('中优先级')) {
        params.priority = '中';
      } else if (queryLower.includes('低优先级')) {
        params.priority = '低';
      }

      // 尝试提取分配人
      const assigneeMatch = query.match(/(?:张三|李四|王五|赵六)/);
      if (assigneeMatch) {
        params.assignee = assigneeMatch[0];
      }
      break;

    case 'calculate':
      // 提取数学表达式
      const calcMatch = query.match(/(\d+[\+\-\*/]\d+)/);
      if (calcMatch) {
        params.expression = calcMatch[1];
      } else {
        // 尝试其他格式
        const simpleMatch = query.match(/(?:计算|算一下|等于|结果|多少)(.+?)(?:等于|结果|是多少|吗|？|\?|$)/);
        if (simpleMatch) {
          params.expression = simpleMatch[1].trim();
        } else if (queryLower.includes('加') || queryLower.includes('减') ||
                   queryLower.includes('乘') || queryLower.includes('除')) {
          // 提取简单计算
          const numbers = query.match(/\d+/g);
          if (numbers && numbers.length >= 2) {
            if (queryLower.includes('加')) params.expression = `${numbers[0]}+${numbers[1]}`;
            else if (queryLower.includes('减')) params.expression = `${numbers[0]}-${numbers[1]}`;
            else if (queryLower.includes('乘')) params.expression = `${numbers[0]}*${numbers[1]}`;
            else if (queryLower.includes('除')) params.expression = `${numbers[0]}/${numbers[1]}`;
          }
        }
      }
      break;

    case 'convert_units':
      // 提取转换参数
      const numMatch = query.match(/(\d+(?:\.\d+)?)/);
      if (numMatch) {
        params.value = parseFloat(numMatch[1]);

        if (queryLower.includes('摄氏') && queryLower.includes('华氏')) {
          params.from = 'celsius';
          params.to = 'fahrenheit';
        } else if (queryLower.includes('华氏') && queryLower.includes('摄氏')) {
          params.from = 'fahrenheit';
          params.to = 'celsius';
        } else if (queryLower.includes('米') && queryLower.includes('英尺')) {
          params.from = 'meters';
          params.to = 'feet';
        } else if (queryLower.includes('英尺') && queryLower.includes('米')) {
          params.from = 'feet';
          params.to = 'meters';
        } else if (queryLower.includes('美元') && queryLower.includes('人民币')) {
          params.from = 'usd';
          params.to = 'cny';
        } else if (queryLower.includes('人民币') && queryLower.includes('美元')) {
          params.from = 'cny';
          params.to = 'usd';
        }
      }
      break;
  }

  console.log(C.blue + `📋 提取的参数: ${JSON.stringify(params, null, 2)}` + C.reset);
  return params;
}

// 执行工具调用
async function executeToolCall(toolName, params) {
  console.log(C.green + `🛠️  执行工具: ${toolName}` + C.reset);

  try {
    const result = await executeTool(toolName, params);

    if (result.success) {
      console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);

      // 显示结果摘要
      if (Array.isArray(result.data)) {
        console.log(C.cyan + `📊 结果数量: ${result.count || result.data.length}` + C.reset);
        if (result.data.length > 0 && result.data.length <= 3) {
          console.log(C.cyan + `📋 详细结果:` + C.reset);
          result.data.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${JSON.stringify(item)}`);
          });
        } else if (result.data.length > 3) {
          console.log(C.cyan + `📋 前3条结果:` + C.reset);
          result.data.slice(0, 3).forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${JSON.stringify(item)}`);
          });
          console.log(C.cyan + `   ... 还有 ${result.data.length - 3} 条` + C.reset);
        }
      } else if (result.data) {
        console.log(C.cyan + `📋 结果数据:` + C.reset);
        console.log(JSON.stringify(result.data, null, 2));
      }

      return result;
    } else {
      console.log(C.red + `❌ 工具执行失败: ${result.error || result.message}` + C.reset);
      return result;
    }
  } catch (error) {
    console.log(C.red + `❌ 工具调用异常: ${error.message}` + C.reset);
    return {
      success: false,
      error: error.message,
      message: '工具调用过程中出错'
    };
  }
}

// ================== 对话系统 ==================

// 提示模板
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

const toolsResultPrompt = ChatPromptTemplate.fromMessages([
  ["system", `你是一个AI助手，可以调用工具获取信息。当用户询问数据相关信息时，你会调用合适的工具，然后基于工具结果回答问题。

工具调用流程：
1. 识别用户问题需要工具调用
2. 调用相应工具获取数据
3. 基于工具返回的数据生成自然语言回答

请确保回答基于工具返回的实际数据。`],
  ["placeholder", "{history}"],
  [
    "human",
    `用户原问题：{input}

工具执行结果：
{tool_result}

请基于以上工具执行结果，用自然语言回答用户的问题。`,
  ],
]);

// 创建对话链
const generalChain = RunnableSequence.from([generalPrompt, model]);
const ragChain = RunnableSequence.from([ragPrompt, model]);
const toolsResultChain = RunnableSequence.from([toolsResultPrompt, model]);

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

// 智能响应函数
async function getIntelligentAIResponse(query, intentResult, sessionId) {
  const { action, suggested_tool } = intentResult;

  console.log(C.green + "🤖 AI：" + C.reset);

  try {
    if (action === 'tools' && suggested_tool) {
      // 工具调用模式
      console.log(C.cyan + "🔧 进入工具调用模式..." + C.reset);

      // 1. 提取参数
      const params = await extractToolParameters(query, suggested_tool);

      // 2. 执行工具调用
      const toolResult = await executeToolCall(suggested_tool, params);

      if (toolResult.success) {
        // 3. 基于工具结果生成回答
        console.log(C.cyan + "\n🧠 基于工具结果生成回答..." + C.reset);

        const summaryResponse = await toolsResultChain.invoke({
          input: query,
          tool_result: JSON.stringify(toolResult.data, null, 2),
          history: ""
        });

        console.log(summaryResponse.content);
        return summaryResponse.content;
      } else {
        // 工具失败，回退到通用回答
        console.log(C.magenta + "⚠️ 工具调用失败，回退到通用回答" + C.reset);
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
    } else if (action === 'knowledge') {
      // RAG模式
      const knowledgeResult = await retrieveKnowledge(query);
      line();

      const stream = await ragChat.stream(
        { input: query, docs: knowledgeResult.docs },
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

// ================== 主程序 ==================

async function main() {
  console.log(C.cyan + "\n✨ 智能RAG助手（修复版）启动！" + C.reset);
  line();

  console.log(C.blue + "🧠 特性：真正的LLM意图识别 + 可靠工具调用" + C.reset);
  console.log(C.blue + "🔧 修复了工具调用问题，使用智能参数提取" + C.reset);
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

  const sessionId = "rag-tools-fixed";

  console.log("\n💡 使用方法：");
  console.log("- LLM自动判断问题类型（知识库/工具/通用）");
  console.log("- 智能参数提取，支持自然语言查询");
  console.log("- 输入 'clear' 重置对话记忆");
  console.log("- 输入 'tools' 查看可用工具");
  console.log("- 输入 'exit' 退出");
  console.log("\n🎯 示例问题：");
  console.log("- 知识库: '代码规范有哪些要求？'");
  console.log("- 工具调用: '公司有哪些员工？'");
  console.log("- 工具调用: '计算一下2+3*4'");
  console.log("- 工具调用: '进行中的项目有哪些？'");
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

      // 1. 智能意图识别
      const intentResult = await intelligentIntentRecognition(userInput);
      line();

      // 2. 获取AI响应
      await getIntelligentAIResponse(userInput, intentResult, sessionId);

      console.log("\n");
      line();
    }
  } catch (error) {
    console.error(C.magenta + "\n❌ 程序错误: " + error.message + C.reset);
    console.error(error.stack);
  } finally {
    closeReadline();
    console.log(C.cyan + "\n🎉 感谢使用智能RAG助手（修复版）！" + C.reset);
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