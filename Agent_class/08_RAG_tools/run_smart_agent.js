/**
 * 智能助手运行入口
 * 启动智能助手并进入交互模式
 */

import { runSmartAgent } from "./lib/main.js";

// 运行智能助手
runSmartAgent().catch(error => {
  console.error("程序运行出错:", error);
  process.exit(1);
});