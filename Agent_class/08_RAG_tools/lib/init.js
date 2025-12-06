/**
 * 初始化模块
 * 负责初始化知识库和检查API服务器状态
 */

import { checkServerHealth } from "../tools_client.js";
import { initDB } from "../rag_search.js";

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
 * 初始化知识库
 * @returns {Promise<void>}
 */
async function initializeKnowledgeBase() {
  try {
    console.log("正在加载知识库...");
    await initDB();
    console.log("✅ 知识库加载成功");
  } catch (error) {
    console.error(C.magenta + "❌ 知识库加载失败: " + error.message + C.reset);
    throw error;
  }
}

/**
 * 检查API服务器状态
 * @returns {Promise<Object>} 服务器状态信息
 */
async function checkAPIServer() {
  console.log("🔄 检查API服务器状态...");
  const serverStatus = await checkServerHealth();
  if (!serverStatus.available) {
    throw new Error("API服务器不可用，请确保api_server.js正在运行");
  }
  console.log(C.green + `✅ API服务器可用 (${serverStatus.status})` + C.reset);
  return serverStatus;
}

/**
 * 初始化智能助手环境
 * @returns {Promise<Object>} 初始化结果
 */
async function initializeEnvironment() {
  try {
    // 检查API服务器
    const serverStatus = await checkAPIServer();

    // 初始化知识库
    await initializeKnowledgeBase();

    return {
      success: true,
      serverStatus,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export { initializeEnvironment, initializeKnowledgeBase, checkAPIServer };