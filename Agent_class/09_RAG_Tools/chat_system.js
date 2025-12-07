import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  RunnableSequence,
  RunnableWithMessageHistory,
} from "@langchain/core/runnables";
import { formatToolResult } from "./tool_manager.js";
import { C, printSuccess, printInfo, printError, printDebug } from "./utils.js";

// ================== 模型配置 ==================

// LLM配置 - 主模型
let model = null;

export function getModel() {
  if (!model) {
    model = new ChatOllama({
      model: "llama3.1:8b",
      temperature: 0.7,
    });
  }
  return model;
}

// ================== 提示模板 ==================

// 不同的提示模板
export const generalPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个友好的AI助手，回答通用问题。"],
  ["placeholder", "{history}"],
  ["human", "{input}"],
]);

export const ragPrompt = ChatPromptTemplate.fromMessages([
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

// ================== 对话链创建 ==================

// 创建两个对话链
export function createChains() {
  const modelInstance = getModel();

  const generalChain = RunnableSequence.from([generalPrompt, modelInstance]);
  const ragChain = RunnableSequence.from([ragPrompt, modelInstance]);

  return { generalChain, ragChain };
}

// ================== 记忆管理 ==================

const store = new Map();

export function getStore() {
  return store;
}

export function getMessageHistory(sessionId) {
  if (!store.has(sessionId)) {
    store.set(sessionId, new InMemoryChatMessageHistory());
  }
  return store.get(sessionId);
}

export function createChatWithHistory(generalChain, ragChain) {
  const generalChat = new RunnableWithMessageHistory({
    runnable: generalChain,
    getMessageHistory: (sid) => getMessageHistory(sid),
    inputMessagesKey: "input",
    historyMessagesKey: "history",
  });

  const ragChat = new RunnableWithMessageHistory({
    runnable: ragChain,
    getMessageHistory: (sid) => getMessageHistory(sid),
    inputMessagesKey: "input",
    historyMessagesKey: "history",
  });

  return { generalChat, ragChat };
}

// ================== 智能响应函数 ==================

// 智能响应函数
export async function getIntelligentAIResponse(query, retrievalResult, sessionId, chatInstances) {
  const { needsRetrieval, needsTool, toolResult, docs } = retrievalResult;
  const { generalChat, ragChat } = chatInstances;

  printSuccess("🤖 AI：");

  try {
    let stream;

    if (needsTool && toolResult) {
      // 如果是工具调用，直接显示工具结果
      printInfo("🛠️ 工具调用结果：");

      if (toolResult.success) {
        const formattedResult = formatToolResult(toolResult);
        console.log(formattedResult);

        // 将工具结果作为上下文，让AI进行解释或总结
        const toolContext = `用户问题：${query}\n工具调用结果：${formattedResult}`;

        stream = await generalChat.stream(
          { input: `${toolContext}\n\n请基于以上工具调用结果，对用户的问题进行回答或总结。` },
          { configurable: { sessionId } }
        );
      } else {
        printError(`❌ 工具调用失败: ${toolResult.error}`);
        // 工具调用失败时，尝试基于通用知识回答
        stream = await generalChat.stream(
          { input: query },
          { configurable: { sessionId } }
        );
      }
    } else if (needsRetrieval) {
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
    if (stream) {
      for await (const chunk of stream) {
        if (chunk?.content) {
          process.stdout.write(chunk.content);
          response += chunk.content;
        }
      }
    }

    if (response.length === 0 && !(needsTool && toolResult)) {
      console.log("（AI没有生成响应）");
    }

    return response;
  } catch (error) {
    printError(`❌ AI响应错误: ${error.message}`);
    return null;
  }
}

// ================== 对话管理工具 ==================

export function clearConversation(sessionId) {
  const store = getStore();
  store.delete(sessionId);
  printInfo("🧹 对话记忆已重置");
}

export function getConversationStats(sessionId) {
  const store = getStore();
  const history = store.get(sessionId);
  if (!history) {
    return { messageCount: 0, hasHistory: false };
  }

  // 这里可以扩展更多统计信息
  return { messageCount: 0, hasHistory: true }; // 实际应该从history获取
}

// ================== 检索结果处理 ==================

export function formatSearchResults(results) {
  if (!results || results.length === 0) {
    return "（未检索到相关知识）";
  }

  const docList = results
    .map((r, idx) => `【${idx + 1}】${r.text.substring(0, 150)}...`)
    .join("\n\n");

  printSuccess(`✅ 检索完成，找到 ${results.length} 个相关文档`);

  return docList;
}

export function handleSearchError(error) {
  printError(`❌ 检索失败: ${error.message}`);
  return {
    needsRetrieval: false,
    needsTool: false,
    docs: "（知识库检索失败，将基于通用知识回答）",
    results: [],
  };
}