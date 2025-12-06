/**
 * 智能助手核心模块
 * 实现多轮对话、记忆和流式输出功能
 */

import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { allTools, toolMap } from "./tools.js";

// 颜色定义
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

/**
 * 智能助手类
 * 支持多轮对话、记忆和流式输出
 */
class SmartAgent {
  /**
   * 构造函数
   */
  constructor() {
    // 初始化对话历史
    this.conversationHistory = [];

    // 创建LLM实例
    this.model = new ChatOllama({
      model: "llama3.1:8b",
      temperature: 0.7,
    });
  }

  /**
   * 添加消息到对话历史
   * @param {string} role - 角色 ('user' 或 'assistant')
   * @param {string} content - 消息内容
   */
  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });

    // 限制历史记录长度，避免过长
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  /**
   * 清除对话历史
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * 格式化对话历史用于提示
   * @returns {string} 格式化的对话历史
   */
  formatHistory() {
    return this.conversationHistory.map(msg =>
      `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`
    ).join('\n');
  }

  /**
   * 分析用户请求并决定是否需要调用工具
   * @param {string} input - 用户输入
   * @returns {Promise<Object>} 决策结果
   */
  async analyzeRequest(input) {
    console.log(C.cyan + "\n🤔 分析用户请求..." + C.reset);

    // 构建工具列表描述，包含参数信息
    const toolsDescription = allTools.map(tool => {
      let toolDesc = `- ${tool.name}: ${tool.description}`;

      // 如果有参数模式，添加参数信息
      if (tool.schema && tool.schema.shape) {
        const params = Object.keys(tool.schema.shape).map(param => {
          const paramSchema = tool.schema.shape[param];
          const description = paramSchema.description || '';
          const isOptional = paramSchema.isOptional ? '(可选)' : '(必需)';
          return `  - ${param}: ${description} ${isOptional}`;
        }).join('\n');

        if (params) {
          toolDesc += `\n  参数:\n${params}`;
        }
      }

      return toolDesc;
    }).join('\n\n');

    // 构建对话历史
    const history = this.formatHistory();

    // 创建决策提示模板
    const decisionPrompt = ChatPromptTemplate.fromMessages([
      ["system", `你是一个智能助手，需要分析用户的问题并决定是否需要调用工具来回答。

可用的工具包括：
{tools}

对话历史：
{history}

请分析用户的问题，如果需要调用工具，请回复JSON格式：
{{"need_tool": true, "tool_name": "工具名称", "tool_args": {{参数键值对}}, "reason": "选择此工具的理由"}}

特别注意：
1. tool_args必须是一个包含所需参数的JSON对象
2. 对于searchKnowledgeBase工具，必须包含"query"参数（字符串类型）
3. 对于getUsers工具，可以包含"searchName"或"userId"参数
4. 参数必须符合工具定义的schema要求

如果不需要调用工具，直接回答问题，请回复JSON格式：
{{"need_tool": false, "response": "直接的回答内容"}}`],
      ["human", "{input}"],
    ]);

    try {
      // 格式化提示并调用模型
      const decisionMessages = await decisionPrompt.formatMessages({
        tools: toolsDescription,
        history: history,
        input: input
      });

      const decisionResult = await this.model.invoke(decisionMessages);
      const decisionContent = decisionResult.content;

      // 解析决策结果
      let decision;
      try {
        // 尝试提取JSON
        const jsonMatch = decisionContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          decision = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("无法解析决策结果");
        }
      } catch (parseError) {
        console.log(C.magenta + "⚠️ 决策解析失败，使用默认回答" + C.reset);
        return {
          need_tool: false,
          response: "抱歉，我无法理解您的请求。"
        };
      }

      return decision;
    } catch (error) {
      console.log(C.red + `❌ 决策过程出错: ${error.message}` + C.reset);
      return {
        need_tool: false,
        response: "抱歉，我在处理您的请求时遇到了问题。"
      };
    }
  }

  /**
   * 调用指定工具
   * @param {string} toolName - 工具名称
   * @param {Object} toolArgs - 工具参数
   * @returns {Promise<string>} 工具执行结果
   */
  async callTool(toolName, toolArgs) {
    // 检查工具是否存在
    if (!toolMap[toolName]) {
      console.log(C.red + `❌ 工具 ${toolName} 不存在` + C.reset);
      throw new Error(`工具 ${toolName} 不存在`);
    }

    // 验证和处理参数
    let validatedArgs = toolArgs || {};

    // 特殊处理searchKnowledgeBase工具
    if (toolName === 'searchKnowledgeBase') {
      // 确保query参数存在并且是字符串
      if (!validatedArgs.query) {
        // 如果没有query参数，使用用户原始输入作为查询
        validatedArgs = { ...validatedArgs, query: this.conversationHistory[this.conversationHistory.length - 1]?.content || '' };
      }

      // 确保query是字符串
      if (typeof validatedArgs.query !== 'string') {
        validatedArgs.query = String(validatedArgs.query);
      }

      // 确保limit是数字
      if (validatedArgs.limit && typeof validatedArgs.limit !== 'number') {
        validatedArgs.limit = parseInt(validatedArgs.limit) || 3;
      }
    }

    console.log(C.blue + `🔧 准备调用工具: ${toolName}` + C.reset);
    console.log(C.blue + `📋 验证后参数: ${JSON.stringify(validatedArgs, null, 2)}` + C.reset);

    // 调用工具
    try {
      const toolResult = await toolMap[toolName].invoke(validatedArgs);
      return toolResult;
    } catch (toolError) {
      console.log(C.red + `❌ 工具调用失败: ${toolError.message}` + C.reset);
      throw toolError;
    }
  }

  /**
   * 基于工具结果生成最终回答
   * @param {string} input - 原始用户输入
   * @param {string} toolResult - 工具执行结果
   * @returns {Promise<string>} 最终回答
   */
  async generateResponse(input, toolResult) {
    // 创建响应提示模板
    const responsePrompt = ChatPromptTemplate.fromMessages([
      ["system", "你是一个智能助手，需要基于工具执行结果生成自然语言回答。"],
      ["human", `原始问题：{input}

工具执行结果：
{tool_result}

请基于工具执行结果，用自然语言回答用户的问题。`],
    ]);

    try {
      // 格式化提示并调用模型
      const responseMessages = await responsePrompt.formatMessages({
        input: input,
        tool_result: toolResult
      });

      const finalResponse = await this.model.invoke(responseMessages);
      return finalResponse.content;
    } catch (error) {
      console.log(C.red + `❌ 回答生成失败: ${error.message}` + C.reset);
      return "抱歉，我在生成回答时遇到了问题。";
    }
  }

  /**
   * 处理用户输入并生成回答
   * @param {string} input - 用户输入
   * @returns {Promise<string>} 助手的回答
   */
  async processInput(input) {
    // 添加用户输入到历史
    this.addToHistory('user', input);

    try {
      // 分析请求
      const decision = await this.analyzeRequest(input);

      let response;
      if (decision.need_tool) {
        console.log(C.blue + `🧠 决策: 需要调用工具 ${decision.tool_name}` + C.reset);
        console.log(C.blue + `📋 理由: ${decision.reason}` + C.reset);

        // 调用工具
        const toolResult = await this.callTool(decision.tool_name, decision.tool_args);

        // 生成最终回答
        response = await this.generateResponse(input, toolResult);
      } else {
        console.log(C.blue + "🧠 决策: 直接回答问题" + C.reset);
        response = decision.response;
      }

      // 添加助手回答到历史
      this.addToHistory('assistant', response);

      return response;
    } catch (error) {
      console.log(C.red + `❌ 处理输入时出错: ${error.message}` + C.reset);
      const errorMessage = "抱歉，处理您的请求时出现了错误。";
      this.addToHistory('assistant', errorMessage);
      return errorMessage;
    }
  }

  /**
   * 流式处理用户输入并输出结果
   * @param {string} input - 用户输入
   * @returns {AsyncGenerator<string, void, unknown>} 流式输出的结果
   */
  async *streamInput(input) {
    // 添加用户输入到历史
    this.addToHistory('user', input);

    try {
      // 分析请求
      const decision = await this.analyzeRequest(input);

      if (decision.need_tool) {
        yield C.blue + `🧠 决策: 需要调用工具 ${decision.tool_name}\n` + C.reset;
        yield C.blue + `📋 理由: ${decision.reason}\n` + C.reset;

        // 调用工具
        const toolResult = await this.callTool(decision.tool_name, decision.tool_args);

        // 生成最终回答
        const response = await this.generateResponse(input, toolResult);

        // 流式输出回答
        for (const char of response) {
          yield char;
        }

        // 添加助手回答到历史
        this.addToHistory('assistant', response);
      } else {
        yield C.blue + "🧠 决策: 直接回答问题\n" + C.reset;

        // 流式输出回答
        for (const char of decision.response) {
          yield char;
        }

        // 添加助手回答到历史
        this.addToHistory('assistant', decision.response);
      }
    } catch (error) {
      console.log(C.red + `❌ 处理输入时出错: ${error.message}` + C.reset);
      const errorMessage = "抱歉，处理您的请求时出现了错误。";
      this.addToHistory('assistant', errorMessage);

      // 流式输出错误信息
      for (const char of errorMessage) {
        yield char;
      }
    }
  }
}

export { SmartAgent };