/**
 * 工具定义模块
 * 定义所有可用的工具及其功能
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { executeTool } from "../tools_client.js";
import { search } from "../rag_search.js";

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
 * 获取用户信息工具
 */
const getUsersTool = tool(
  async (input) => {
    console.log(C.cyan + "🔧 调用工具: 获取用户信息" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const result = await executeTool("getUsers", input);
      if (result.success) {
        console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);
        return JSON.stringify(result.data);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.log(C.red + `❌ 工具执行失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "getUsers",
    description: "获取用户列表，或根据条件搜索用户",
    schema: z.object({
      searchName: z.string().optional().describe("搜索用户名或邮箱（可选）"),
      userId: z.number().optional().describe("获取特定用户ID的信息（可选）")
    }),
  }
);

/**
 * 获取项目信息工具
 */
const getProjectsTool = tool(
  async (input) => {
    console.log(C.cyan + "🔧 调用工具: 获取项目信息" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const result = await executeTool("getProjects", input);
      if (result.success) {
        console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);
        return JSON.stringify(result.data);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.log(C.red + `❌ 工具执行失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "getProjects",
    description: "获取项目列表，可以按状态过滤",
    schema: z.object({
      status: z.enum(["进行中", "已完成", "计划中"]).optional().describe("项目状态（可选）"),
      projectId: z.number().optional().describe("获取特定项目ID的详细信息（可选）")
    }),
  }
);

/**
 * 获取任务信息工具
 */
const getTasksTool = tool(
  async (input) => {
    console.log(C.cyan + "🔧 调用工具: 获取任务信息" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const result = await executeTool("getTasks", input);
      if (result.success) {
        console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);
        return JSON.stringify(result.data);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.log(C.red + `❌ 工具执行失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "getTasks",
    description: "获取任务列表，可以按分配人、优先级或项目过滤",
    schema: z.object({
      assignee: z.string().optional().describe("任务分配人姓名（可选）"),
      priority: z.enum(["高", "中", "低"]).optional().describe("任务优先级（可选）"),
      project: z.string().optional().describe("所属项目名称（可选）")
    }),
  }
);

/**
 * 获取公司信息工具
 */
const getCompanyInfoTool = tool(
  async (input) => {
    console.log(C.cyan + "🔧 调用工具: 获取公司信息" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const result = await executeTool("getCompanyInfo", input);
      if (result.success) {
        console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);
        return JSON.stringify(result.data);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.log(C.red + `❌ 工具执行失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "getCompanyInfo",
    description: "获取公司基本信息",
    schema: z.object({
      includeMetrics: z.boolean().optional().describe("是否包含公司指标数据（可选，默认false）")
    }),
  }
);

/**
 * 数学计算工具
 */
const calculateTool = tool(
  async (input) => {
    console.log(C.cyan + "🔧 调用工具: 计算数学表达式" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const result = await executeTool("calculate", input);
      if (result.success) {
        console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);
        return JSON.stringify(result.data);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.log(C.red + `❌ 工具执行失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "calculate",
    description: "执行数学计算，支持加减乘除等基本运算",
    schema: z.object({
      expression: z.string().describe("数学表达式，如 \"2 + 3 * 4\"、\"sqrt(16)\" 等")
    }),
  }
);

/**
 * 单位转换工具
 */
const convertUnitsTool = tool(
  async (input) => {
    console.log(C.cyan + "🔧 调用工具: 单位转换" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const result = await executeTool("convertUnits", input);
      if (result.success) {
        console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);
        return JSON.stringify(result.data);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.log(C.red + `❌ 工具执行失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "convertUnits",
    description: "单位转换，支持温度、长度、货币等",
    schema: z.object({
      value: z.number().describe("需要转换的数值"),
      from: z.string().describe("原始单位，如 \"celsius\"、\"meters\"、\"USD\""),
      to: z.string().describe("目标单位，如 \"fahrenheit\"、\"feet\"、\"CNY\"")
    }),
  }
);

/**
 * 获取系统状态工具
 */
const getSystemStatusTool = tool(
  async (input) => {
    console.log(C.cyan + "🔧 调用工具: 获取系统状态" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const result = await executeTool("getSystemStatus", input);
      if (result.success) {
        console.log(C.green + `✅ 工具执行成功: ${result.message}` + C.reset);
        return JSON.stringify(result.data);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.log(C.red + `❌ 工具执行失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "getSystemStatus",
    description: "获取API服务器状态和运行信息",
    schema: z.object({}),
  }
);

/**
 * 搜索知识库工具
 */
const searchKnowledgeBaseTool = tool(
  async (input) => {
    console.log(C.cyan + "🔍 调用工具: 搜索知识库" + C.reset);
    console.log(C.blue + `📋 参数: ${JSON.stringify(input, null, 2)}` + C.reset);

    try {
      const results = await search(input.query, input.limit || 3);
      const docList = results.length > 0
        ? results.map((r, idx) => `【${idx + 1}】${r.text.substring(0, 150)}...`).join("\n\n")
        : "（未检索到相关知识）";

      console.log(C.green + `✅ 知识库检索完成，找到 ${results.length} 个相关文档` + C.reset);
      return docList;
    } catch (error) {
      console.log(C.red + `❌ 知识库检索失败: ${error.message}` + C.reset);
      throw error;
    }
  },
  {
    name: "searchKnowledgeBase",
    description: "搜索知识库以获取相关信息",
    schema: z.object({
      query: z.string().describe("搜索查询"),
      limit: z.number().optional().describe("返回结果数量限制（可选，默认3）")
    }),
  }
);

// 所有工具列表
const allTools = [
  getUsersTool,
  getProjectsTool,
  getTasksTool,
  getCompanyInfoTool,
  calculateTool,
  convertUnitsTool,
  getSystemStatusTool,
  searchKnowledgeBaseTool
];

// 创建工具映射
const toolMap = {};
allTools.forEach(tool => {
  toolMap[tool.name] = tool;
});

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
};