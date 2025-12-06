/**
 * 智能助手模块入口
 * 导出所有公共接口
 */

export { SmartAgent } from "./lib/agent.js";
export { createSmartAgent, runSmartAgent } from "./lib/main.js";
export {
  allTools,
  toolMap,
  getUsersTool,
  getProjectsTool,
  getTasksTool,
  getCompanyInfoTool,
  calculateTool,
  convertUnitsTool,
  getSystemStatusTool,
  searchKnowledgeBaseTool
} from "./lib/tools.js";