// ================== 模块化智能RAG助手 ==================
// 主程序文件 - 使用模块化结构

import { initDB, search } from "./rag_search.js";
import { intelligentRetrieve } from "./intent_detector.js";
import {
  createChains,
  createChatWithHistory,
  getIntelligentAIResponse,
  clearConversation,
  formatSearchResults,
  handleSearchError
} from "./chat_system.js";
import {
  line,
  printSection,
  printInfo,
  printSuccess,
  printError,
  printDebug,
  askQuestion,
  closeReadline,
  formatList
} from "./utils.js";

// ================== 配置常量 ==================

const SESSION_ID = "rag-session";
const DEFAULT_MODE = false; // false = 规则模式, true = LLM模式

// ================== 使用说明 ==================

function printUsage() {
  console.log("\n💡 使用方法：");
  console.log("- 通用问题（问候、闲聊）：直接回答");
  console.log("- 专业问题（技术、规范）：检索知识库后回答");
  console.log("- 工具问题（计算、查询、转换）：自动调用工具");
  console.log("- 输入 'mode llm' 切换为LLM意图分析");
  console.log("- 输入 'mode rule' 切换为规则判断");
  console.log("\n🛠️ 工具调用示例：");
  console.log("  • 计算：\"2+3等于多少\"，\"计算sin(30)\"");
  console.log("  • 转换：\"20摄氏度等于多少华氏度\"，\"100美元等于多少人民币\"");
  console.log("  • 查询：\"有哪些用户\"，\"张三的信息\"，\"项目状态\"");
  console.log("  • 系统：\"系统状态\"，\"内存使用情况\"");
  line();
}

function printWelcome() {
  printSection("✨ 智能RAG助手启动！");

  console.log("🧠 特性：智能检索决策 + 多轮对话 + 流式输出 + 工具调用");
  console.log("📊 模式：混合（规则 + LLM意图分析）");
  console.log("🛠️ 支持工具：计算器、单位转换、数据查询、系统状态等");
  line();
}

// ================== 系统命令处理 ==================

function handleSystemCommand(inputLower) {
  // 退出命令
  if (["exit", "quit", "退出", "bye", "再见"].includes(inputLower)) {
    console.log("\n👋 再见！");
    return { action: "exit" };
  }

  // 清空对话记忆
  if (["clear", "重置", "reset"].includes(inputLower)) {
    clearConversation(SESSION_ID);
    return { action: "continue" };
  }

  // 模式切换
  if (inputLower === "mode llm") {
    printInfo("🔄 切换到LLM意图分析模式");
    return { action: "setMode", mode: true };
  }

  if (inputLower === "mode rule") {
    printInfo("🔄 切换到规则判断模式");
    return { action: "setMode", mode: false };
  }

  return null;
}

// ================== 主循环 ==================

async function mainLoop(useLLMIntent, chatInstances) {
  try {
    while (true) {
      const userInput = await askQuestion("🧑 你：");

      if (!userInput || userInput.trim() === "") {
        continue;
      }

      const inputLower = userInput.toLowerCase().trim();

      // 处理系统命令
      const commandResult = handleSystemCommand(inputLower);
      if (commandResult) {
        if (commandResult.action === "exit") {
          break;
        } else if (commandResult.action === "continue") {
          line();
          continue;
        } else if (commandResult.action === "setMode") {
          useLLMIntent = commandResult.mode;
          line();
          continue;
        }
      }

      // 智能检索决策
      printSection("🤔 分析问题意图...");

      const retrievalResult = await intelligentRetrieve(userInput, useLLMIntent);

      // 如果是知识库检索，执行搜索并格式化结果
      if (retrievalResult.needsRetrieval && !retrievalResult.needsTool) {
        try {
          const results = await search(userInput, 3);
          retrievalResult.docs = formatSearchResults(results);
          retrievalResult.results = results;
        } catch (searchError) {
          Object.assign(retrievalResult, handleSearchError(searchError));
        }
      }

      line();

      // 获取AI响应
      await getIntelligentAIResponse(
        userInput,
        retrievalResult,
        SESSION_ID,
        chatInstances
      );

      console.log("\n");
      line();
    }
  } catch (error) {
    printError(`\n❌ 程序错误: ${error.message}`);
    console.error(error.stack);
  }
}

// ================== 主函数 ==================

async function main() {
  // 1. 显示欢迎信息
  printWelcome();

  // 2. 加载知识库
  try {
    console.log("正在加载知识库...");
    await initDB();
    printSuccess("✅ 知识库加载成功");
  } catch (error) {
    printError(`❌ 知识库加载失败: ${error.message}`);
    console.log("请先运行 embed.js 构建知识库");
    closeReadline();
    process.exit(1);
  }

  // 3. 显示使用说明
  printUsage();

  // 4. 初始化对话系统
  const { generalChain, ragChain } = createChains();
  const chatInstances = createChatWithHistory(generalChain, ragChain);

  // 5. 进入主循环
  let useLLMIntent = DEFAULT_MODE;
  await mainLoop(useLLMIntent, chatInstances);

  // 6. 清理和退出
  closeReadline();
  printSuccess("\n🎉 感谢使用智能RAG助手！");
}

// ================== 全局错误处理 ==================

process.on("uncaughtException", (error) => {
  printError(`\n❌ 未捕获异常: ${error.message}`);
  closeReadline();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  printError(`\n❌ 未处理拒绝: ${reason}`);
  closeReadline();
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n\n👋 收到中断信号，正在退出...");
  closeReadline();
  process.exit(0);
});

// ================== 启动程序 ==================

main().catch((error) => {
  printError(`❌ 启动失败: ${error.message}`);
  closeReadline();
  process.exit(1);
});