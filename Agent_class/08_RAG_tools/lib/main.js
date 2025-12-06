/**
 * 主模块
 * 智能助手的主入口点，负责协调各个组件
 */

import { SmartAgent } from "./agent.js";
import { initializeEnvironment } from "./init.js";

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
 * 创建智能助手实例
 * @returns {Promise<SmartAgent|null>} 智能助手实例或null（如果初始化失败）
 */
async function createSmartAgent() {
  try {
    // 初始化环境
    const initResult = await initializeEnvironment();
    if (!initResult.success) {
      console.error(C.red + "❌ 环境初始化失败: " + initResult.error + C.reset);
      return null;
    }

    // 创建智能助手实例
    const agent = new SmartAgent();
    return agent;
  } catch (error) {
    console.error(C.red + "❌ 创建智能助手失败: " + error.message + C.reset);
    return null;
  }
}

/**
 * 运行智能助手
 * @returns {Promise<void>}
 */
async function runSmartAgent() {
  console.log(C.cyan + "\n✨ 智能助手（基于Langchain）启动！" + C.reset);
  line();

  // 创建智能助手实例
  const agent = await createSmartAgent();
  if (!agent) {
    console.error(C.red + "❌ 智能助手启动失败" + C.reset);
    return;
  }

  console.log(C.green + "✅ 智能助手初始化完成" + C.reset);
  console.log("\n💡 使用方法：");
  console.log("- 直接提问，助手会自动判断是否需要调用工具");
  console.log("- 支持自然语言查询");
  console.log("- 输入 'clear' 清除对话历史");
  console.log("- 输入 'exit' 退出");
  line();

  // 进入交互循环
  await interactiveLoop(agent);
}

/**
 * 打印分隔线
 */
function line() {
  console.log(
    C.dim + "──────────────────────────────────────────────" + C.reset
  );
}

/**
 * 交互循环
 * @param {SmartAgent} agent - 智能助手实例
 */
async function interactiveLoop(agent) {
  // 递归函数处理用户输入
  const processInput = () => {
    process.stdout.write(C.yellow + "🧑 你：\n" + C.reset);

    let input = '';
    process.stdin.setEncoding('utf8');

    const onData = (chunk) => {
      input += chunk;
      if (input.endsWith('\n')) {
        process.stdin.removeListener('data', onData);
        handleInput(input.trim());
      }
    };

    process.stdin.on('data', onData);

    const handleInput = async (input) => {
      // 处理特殊命令
      if (input.toLowerCase() === 'exit') {
        console.log(C.green + "👋 再见！" + C.reset);
        process.exit(0);
        return;
      }

      if (input.toLowerCase() === 'clear') {
        agent.clearHistory();
        console.log(C.green + "🧹 对话历史已清除" + C.reset);
        processInput();
        return;
      }

      // 处理空输入
      if (!input.trim()) {
        processInput();
        return;
      }

      try {
        console.log(C.green + "🤖 AI：" + C.reset);

        // 流式输出结果
        for await (const chunk of agent.streamInput(input)) {
          process.stdout.write(chunk);
        }

        console.log(); // 添加换行
        line();
      } catch (error) {
        console.error(C.red + "❌ 处理输入时出错: " + error.message + C.reset);
      }

      // 继续等待下一个输入
      processInput();
    };
  };

  // 开始交互循环
  processInput();
}

export { createSmartAgent, runSmartAgent, line };