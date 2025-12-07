import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { shouldUseTool } from "./tool_manager.js";
import { C, printInfo, printDebug, printWarning } from "./utils.js";

// ================== 常量定义 ==================

// 通用问题分类（不需要检索的问题）
export const GENERAL_QUESTIONS = {
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
export const KNOWLEDGE_KEYWORDS = [
  "代码", "规范", "规则", "流程", "开发", "测试", "文档",
  "函数", "方法", "类", "模块", "系统", "架构",
  "如何", "怎样", "为什么", "原因", "解决方案", "建议",
  "公司", "项目", "产品", "服务", "技术",
  "定义", "说明", "解释", "介绍", "描述",
];

// 工具调用相关关键词（优先于知识库检索）
export const TOOL_CALL_KEYWORDS = [
  "计算", "算", "等于", "加", "减", "乘", "除", "平方", "开方", "表达式",
  "转换", "换算", "摄氏度", "华氏度", "米", "英尺", "公里", "英里", "美元", "人民币",
  "用户", "员工", "同事", "项目", "任务", "公司", "部门", "信息", "列表", "查询",
  "状态", "运行", "健康", "内存", "性能", "系统"
];

// 疑问词
export const QUESTION_WORDS = [
  "什么", "怎么", "如何", "为什么", "何时", "哪里", "谁", "哪些"
];

// ================== 模型配置 ==================

// 意图识别模型（可以使用同一个模型）
let intentModel = null;

export function getIntentModel() {
  if (!intentModel) {
    intentModel = new ChatOllama({
      model: "llama3.1:8b",
      temperature: 0.3, // 更低的temperature以获得更稳定的分类
    });
  }
  return intentModel;
}

// ================== 工具调用判断 ==================

// 判断是否需要工具调用（优先判断）
export function shouldCallTool(query) {
  const queryLower = query.toLowerCase().trim();

  // 检查是否包含工具调用关键词
  for (const keyword of TOOL_CALL_KEYWORDS) {
    if (queryLower.includes(keyword.toLowerCase())) {
      printInfo(`🔧 检测到工具关键词: "${keyword}" - 可能需要工具调用`);

      // 进一步使用工具管理模块判断
      return shouldUseTool(query);
    }
  }

  return false;
}

// ================== 知识库检索判断 ==================

// 判断是否需要检索知识库
export function shouldRetrieveKnowledge(query) {
  const queryLower = query.toLowerCase().trim();

  // 0. 首先检查是否需要工具调用（工具调用优先）
  if (shouldCallTool(query)) {
    printInfo(`🔧 问题需要工具调用 - 跳过知识库检索`);
    return false; // 工具调用时不需要检索知识库
  }

  // 1. 检查是否是通用问题（不需要检索）
  for (const [category, phrases] of Object.entries(GENERAL_QUESTIONS)) {
    for (const phrase of phrases) {
      if (queryLower.includes(phrase.toLowerCase())) {
        printInfo(`📋 分类: ${category} - 不需要检索`);
        return false;
      }
    }
  }

  // 2. 检查是否包含知识库关键词（需要检索）
  for (const keyword of KNOWLEDGE_KEYWORDS) {
    if (queryLower.includes(keyword.toLowerCase())) {
      printInfo(`🔑 检测到关键词: "${keyword}" - 需要检索`);
      return true;
    }
  }

  // 3. 基于问题长度和结构判断
  const words = queryLower.split(/\s+/).length;
  if (words <= 3) {
    // 简短问题通常是通用问题
    printInfo(`📏 简短问题(${words}词) - 不需要检索`);
    return false;
  }

  // 4. 检查是否是疑问句（需要更多信息）
  const hasQuestionWord = QUESTION_WORDS.some((word) =>
    queryLower.includes(word)
  );

  if (hasQuestionWord) {
    printInfo(`❓ 疑问句 - 需要检索`);
    return true;
  }

  // 5. 默认情况：对于中等长度的问题，使用检索
  printInfo(`⚖️ 中等长度问题(${words}词) - 默认检索`);
  return true;
}

// ================== LLM意图识别 ==================

// 使用LLM进行意图识别（更准确但稍慢）
export async function analyzeIntentWithLLM(query) {
  try {
    const systemPrompt = `你是一个意图分类器。请分析用户问题是否需要检索知识库来回答，或者是否需要调用工具。

知识库内容：公司开发规范、代码示例、技术文档等。
可用工具：计算器、单位转换、用户查询、项目查询、任务查询、公司信息查询等。

请严格按照以下JSON格式回答，不要添加任何额外文字：
{{"needs_retrieval": true, "reason": "原因说明"}}
或者
{{"needs_retrieval": false, "reason": "原因说明"}}
或者
{{"needs_tool": true, "reason": "原因说明"}}`;

    const intentPrompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", "用户问题：{query}"],
    ]);

    const intentChain = RunnableSequence.from([intentPrompt, getIntentModel()]);
    const response = await intentChain.invoke({ query: query });

    // 打印LLM的原始响应用于调试
    printDebug(`🔧 LLM原始响应: ${response.content}`);

    try {
      // 尝试解析JSON响应
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intent = JSON.parse(jsonMatch[0]);

        // 验证返回的数据结构
        if (typeof intent.needs_retrieval === 'boolean' && typeof intent.reason === 'string') {
          printInfo(`🧠 LLM分析: ${intent.reason}`);
          return intent.needs_retrieval;
        } else {
          printWarning(`⚠️ LLM响应格式不完整，使用规则判断`);
        }
      } else {
        printWarning(`⚠️ LLM响应中未找到JSON格式，使用规则判断`);
      }
    } catch (parseError) {
      // 如果JSON解析失败，回退到基于规则的方法
      printWarning(`⚠️ LLM响应JSON解析失败，使用规则判断`);
      printDebug(`解析错误详情: ${parseError.message}`);
    }
  } catch (error) {
    printWarning(`⚠️ LLM意图分析失败: ${error.message}`);
    printDebug(`错误堆栈: ${error.stack}`);
  }

  // 回退到基于规则的方法
  printInfo(`🔄 回退到规则判断模式`);
  return shouldRetrieveKnowledge(query);
}

// ================== 智能检索和工具调用 ==================

// 智能检索和工具调用函数
export async function intelligentRetrieve(query, useLLM = false) {
  // 动态导入以避免循环依赖
  const { intelligentToolCall, formatToolResult } = await import("./tool_manager.js");

  printDebug(`🔧 当前模式: ${useLLM ? "LLM模式" : "规则模式"}`);
  printDebug(`🔧 用户问题: ${query}`);

  // 首先检查是否需要工具调用（工具调用优先）
  const needsTool = shouldCallTool(query);

  if (needsTool) {
    printInfo("🛠️ 判断为工具调用问题，准备调用工具...");

    try {
      const toolResult = await intelligentToolCall(query);

      if (toolResult) {
        return {
          needsRetrieval: false,
          needsTool: true,
          toolResult: toolResult,
          docs: `（工具调用结果：${formatToolResult(toolResult)}）`,
          results: [],
        };
      } else {
        printWarning("⚠️ 工具调用失败或未找到合适工具，尝试知识库检索");
      }
    } catch (toolError) {
      printError(`❌ 工具调用异常: ${toolError.message}`);
    }
  }

  // 如果不是工具调用问题，继续判断是否需要知识库检索
  let needsRetrieval;
  if (useLLM) {
    printDebug("🔧 使用LLM进行意图分析...");
    needsRetrieval = await analyzeIntentWithLLM(query);
  } else {
    printDebug("🔧 使用规则进行意图分析...");
    needsRetrieval = shouldRetrieveKnowledge(query);
  }

  printDebug(`🔧 分析结果: ${needsRetrieval ? "需要检索" : "无需检索"}`);

  if (!needsRetrieval) {
    return {
      needsRetrieval: false,
      needsTool: false,
      docs: "（当前问题为通用问题，直接回答）",
      results: [],
    };
  }

  return {
    needsRetrieval: true,
    needsTool: false,
    docs: null, // 将由调用者填充
    results: null, // 将由调用者填充
  };
}