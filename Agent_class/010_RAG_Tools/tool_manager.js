import axios from "axios";

// 颜色
const C = {
  dim: "\x1b[2m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// API服务器基础URL
const API_BASE_URL = "http://localhost:3000";

// ================== 工具定义 ==================

// 工具类型定义
const ToolType = {
  CALCULATION: "calculation",      // 计算类工具
  CONVERSION: "conversion",        // 转换类工具
  DATA_QUERY: "data_query",        // 数据查询类工具
  SYSTEM: "system",                // 系统类工具
};

// 工具Schema定义
const TOOLS = [
  {
    name: "calculate",
    type: ToolType.CALCULATION,
    description: "执行数学表达式计算，支持加减乘除、指数、函数等",
    parameters: {
      expression: {
        type: "string",
        description: "要计算的数学表达式，例如：'2+3*4', 'Math.sqrt(16)', 'sin(30)'"
      }
    },
    endpoint: "/api/tools/calculate",
    method: "GET"
  },
  {
    name: "convert",
    type: ToolType.CONVERSION,
    description: "单位转换工具，支持温度、长度、货币等单位的转换",
    parameters: {
      value: {
        type: "number",
        description: "要转换的数值"
      },
      from: {
        type: "string",
        description: "原始单位，例如：'celsius', 'meters', 'usd'"
      },
      to: {
        type: "string",
        description: "目标单位，例如：'fahrenheit', 'feet', 'cny'"
      }
    },
    endpoint: "/api/tools/convert",
    method: "GET"
  },
  {
    name: "get_users",
    type: ToolType.DATA_QUERY,
    description: "获取用户列表，可以按名称搜索用户",
    parameters: {
      name: {
        type: "string",
        description: "可选的用户姓名搜索关键词",
        required: false
      }
    },
    endpoint: "/api/users",
    method: "GET"
  },
  {
    name: "get_user_by_id",
    type: ToolType.DATA_QUERY,
    description: "根据ID获取特定用户信息",
    parameters: {
      id: {
        type: "number",
        description: "用户ID"
      }
    },
    endpoint: "/api/users/:id",
    method: "GET"
  },
  {
    name: "get_projects",
    type: ToolType.DATA_QUERY,
    description: "获取项目列表，可以按状态过滤",
    parameters: {
      status: {
        type: "string",
        description: "项目状态：'进行中', '已完成', '计划中'",
        required: false
      }
    },
    endpoint: "/api/projects",
    method: "GET"
  },
  {
    name: "get_tasks",
    type: ToolType.DATA_QUERY,
    description: "获取任务列表，可以按分配人、优先级、项目过滤",
    parameters: {
      assignee: {
        type: "string",
        description: "任务分配人姓名",
        required: false
      },
      priority: {
        type: "string",
        description: "任务优先级：'高', '中', '低'",
        required: false
      },
      project: {
        type: "string",
        description: "项目名称",
        required: false
      }
    },
    endpoint: "/api/tasks",
    method: "GET"
  },
  {
    name: "get_company_info",
    type: ToolType.DATA_QUERY,
    description: "获取公司基本信息",
    parameters: {},
    endpoint: "/api/company",
    method: "GET"
  },
  {
    name: "get_company_metrics",
    type: ToolType.DATA_QUERY,
    description: "获取公司运营指标",
    parameters: {},
    endpoint: "/api/company/metrics",
    method: "GET"
  },
  {
    name: "get_system_status",
    type: ToolType.SYSTEM,
    description: "获取系统状态信息",
    parameters: {},
    endpoint: "/api/system/status",
    method: "GET"
  }
];

// ================== 工具关键词识别 ==================

// 工具相关关键词
const TOOL_KEYWORDS = {
  calculation: ["计算", "算", "等于", "加", "减", "乘", "除", "平方", "开方", "sin", "cos", "tan", "表达式"],
  conversion: ["转换", "换算", "等于多少", "摄氏度", "华氏度", "米", "英尺", "公里", "英里", "美元", "人民币"],
  data_query: ["用户", "员工", "项目", "任务", "公司", "部门", "信息", "列表", "查询", "查找", "搜索"],
  system: ["状态", "运行", "健康", "内存", "性能", "系统"]
};

// 判断是否需要工具调用
export function shouldUseTool(query) {
  const queryLower = query.toLowerCase().trim();

  // 检查是否包含工具关键词
  for (const [toolType, keywords] of Object.entries(TOOL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (queryLower.includes(keyword)) {
        console.log(C.blue + `🔧 检测到工具关键词: "${keyword}" - 可能需要${toolType}工具` + C.reset);
        return true;
      }
    }
  }

  // 检查是否包含明显的计算表达式
  const calculationPatterns = [
    /\d+\s*[+\-*/]\s*\d+/,  // 数字 +-*/ 数字
    /等于\s*\d+/,           // 等于数字
    /calculate|calc/,       // 英文计算
    /convert|换算|转换/     // 英文转换
  ];

  for (const pattern of calculationPatterns) {
    if (pattern.test(queryLower)) {
      console.log(C.blue + `🔢 检测到计算/转换模式 - 可能需要工具调用` + C.reset);
      return true;
    }
  }

  return false;
}

// ================== 工具选择 ==================

// 选择最适合的工具
export function selectTool(query) {
  const queryLower = query.toLowerCase().trim();
  const matchedTools = [];

  // 根据关键词匹配工具
  for (const tool of TOOLS) {
    let matchScore = 0;

    // 检查工具名称是否在查询中（最高优先级）
    if (queryLower.includes(tool.name.toLowerCase().replace('_', ' '))) {
      matchScore += 5;
    }

    // 检查工具描述中的关键词
    const toolDescLower = tool.description.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    for (const word of queryWords) {
      if (word.length > 2 && toolDescLower.includes(word)) {
        matchScore += 1;
      }
    }

    // 检查工具类型关键词
    if (TOOL_KEYWORDS[tool.type]) {
      for (const keyword of TOOL_KEYWORDS[tool.type]) {
        if (queryLower.includes(keyword)) {
          matchScore += 2;
        }
      }
    }

    // 特殊规则：如果查询包含"公司"，给公司相关工具额外分数
    if (queryLower.includes('公司') && tool.name.includes('company')) {
      matchScore += 3;
    }

    // 特殊规则：如果查询包含"用户"，给用户相关工具额外分数
    if (queryLower.includes('用户') && tool.name.includes('user')) {
      matchScore += 3;
    }

    // 特殊规则：如果查询包含"项目"，给项目相关工具额外分数
    if (queryLower.includes('项目') && tool.name.includes('project')) {
      matchScore += 3;
    }

    // 特殊规则：如果查询包含"任务"，给任务相关工具额外分数
    if (queryLower.includes('任务') && tool.name.includes('task')) {
      matchScore += 3;
    }

    if (matchScore > 0) {
      matchedTools.push({ tool, score: matchScore });
    }
  }

  // 按匹配分数排序
  matchedTools.sort((a, b) => b.score - a.score);

  if (matchedTools.length > 0) {
    console.log(C.green + `🔧 匹配到 ${matchedTools.length} 个可能工具` + C.reset);

    // 显示前3个匹配工具（调试用）
    if (matchedTools.length > 1) {
      console.log(C.dim + `🔍 匹配结果:` + C.reset);
      for (let i = 0; i < Math.min(3, matchedTools.length); i++) {
        console.log(C.dim + `  ${i+1}. ${matchedTools[i].tool.name} (${matchedTools[i].tool.description}) - 分数: ${matchedTools[i].score}` + C.reset);
      }
    }

    return matchedTools[0].tool;
  }

  return null;
}

// ================== 工具参数提取 ==================

// 从查询中提取工具参数
export function extractToolParameters(query, tool) {
  const params = {};
  const queryLower = query.toLowerCase().trim();

  switch (tool.name) {
    case "calculate":
      // 尝试提取数学表达式
      const calcPatterns = [
        // 函数调用：sin(30), cos(45), sqrt(16)
        /(?:计算|等于)?\s*(sin|cos|tan|sqrt|log|Math\.sin|Math\.cos|Math\.tan|Math\.sqrt|Math\.log)\(([^)]+)\)/i,
        // 带运算符的表达式：2+3, 10*5+2
        /(?:计算|等于|算)?\s*([\d+\-*/.\s()]+)\s*(?:等于|结果|是多少|$)/,
        // 纯数学表达式
        /([\d+\-*/.\s()]+)/
      ];

      for (const pattern of calcPatterns) {
        const match = query.match(pattern); // 使用原始query保留大小写
        if (match) {
          let expression = match[1] || match[0];

          // 如果是函数调用，需要重新构造
          const funcNames = ['sin', 'cos', 'tan', 'sqrt', 'log', 'Math.sin', 'Math.cos', 'Math.tan', 'Math.sqrt', 'Math.log'];
          const matchedFunc = funcNames.find(func => match[0].toLowerCase().includes(func.toLowerCase()));

          if (matchedFunc && match[2]) {
            expression = `${matchedFunc}(${match[2]})`;
          }

          if (expression.trim()) {
            params.expression = expression.trim();
            break;
          }
        }
      }

      // 如果没有匹配到，尝试使用整个查询
      if (!params.expression) {
        // 移除非数学字符，但保留函数名
        const mathOnly = query.replace(/[^0-9a-zA-Z+\-*/().\s]/g, '').trim();
        if (mathOnly) {
          params.expression = mathOnly;
        } else {
          params.expression = query;
        }
      }
      break;

    case "convert":
      // 提取转换参数
      const convertPatterns = [
        // 格式: 数值摄氏度等于多少华氏度
        /(\d+(?:\.\d+)?)\s*(摄氏度|华氏度|米|英尺|公里|英里|美元|人民币|celsius|fahrenheit|meters|feet|kilometers|miles|usd|cny|yuan)/i,
        // 格式: 数值 单位 到/转为 单位
        /(\d+(?:\.\d+)?)\s*(\w+)\s*(?:到|转为|转换为|等于多少|to)\s*(\w+)/i,
        // 简单格式: 数值单位
        /(\d+(?:\.\d+)?)(摄氏度|华氏度|米|英尺|公里|英里|美元|人民币|°C|°F|m|ft|km|mi|\$|￥)/i
      ];

      for (const pattern of convertPatterns) {
        const match = query.match(pattern);
        if (match) {
          params.value = parseFloat(match[1]);

          // 单位映射
          const unitMap = {
            // 温度
            '摄氏度': 'celsius', 'celsius': 'celsius', '°C': 'celsius',
            '华氏度': 'fahrenheit', 'fahrenheit': 'fahrenheit', '°F': 'fahrenheit',
            // 长度
            '米': 'meters', 'meters': 'meters', 'm': 'meters',
            '英尺': 'feet', 'feet': 'feet', 'ft': 'feet',
            '公里': 'kilometers', 'kilometers': 'kilometers', 'km': 'kilometers',
            '英里': 'miles', 'miles': 'miles', 'mi': 'miles',
            // 货币
            '美元': 'usd', 'usd': 'usd', '$': 'usd',
            '人民币': 'cny', 'cny': 'cny', 'yuan': 'cny', '￥': 'cny'
          };

          if (match[2] && match[3]) {
            // 格式: 数值 单位 到 单位
            const fromUnit = unitMap[match[2].toLowerCase()] || match[2].toLowerCase();
            const toUnit = unitMap[match[3].toLowerCase()] || match[3].toLowerCase();

            params.from = fromUnit;
            params.to = toUnit;
          } else if (match[2]) {
            // 格式: 数值单位 或 数值 单位
            const detectedUnit = unitMap[match[2].toLowerCase()] || match[2].toLowerCase();

            // 根据检测到的单位推断目标单位
            if (detectedUnit.includes('celsius')) {
              params.from = 'celsius';
              params.to = 'fahrenheit';
            } else if (detectedUnit.includes('fahrenheit')) {
              params.from = 'fahrenheit';
              params.to = 'celsius';
            } else if (detectedUnit.includes('meter')) {
              params.from = 'meters';
              params.to = 'feet';
            } else if (detectedUnit.includes('feet') || detectedUnit.includes('ft')) {
              params.from = 'feet';
              params.to = 'meters';
            } else if (detectedUnit.includes('kilometer') || detectedUnit.includes('km')) {
              params.from = 'kilometers';
              params.to = 'miles';
            } else if (detectedUnit.includes('mile') || detectedUnit.includes('mi')) {
              params.from = 'miles';
              params.to = 'kilometers';
            } else if (detectedUnit.includes('usd') || detectedUnit.includes('$')) {
              params.from = 'usd';
              params.to = 'cny';
            } else if (detectedUnit.includes('cny') || detectedUnit.includes('yuan') || detectedUnit.includes('￥')) {
              params.from = 'cny';
              params.to = 'usd';
            }
          }
          break;
        }
      }

      // 如果没有提取到参数，尝试手动解析
      if (!params.value) {
        // 提取数字
        const numMatch = query.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
          params.value = parseFloat(numMatch[1]);
        }
      }
      break;

    case "get_users":
      // 提取用户搜索关键词
      const userMatch = queryLower.match(/(?:用户|员工|同事)\s*(?:叫|名为|姓名)?\s*(\w+)/);
      if (userMatch && userMatch[1]) {
        params.name = userMatch[1];
      }
      break;

    case "get_projects":
      // 提取项目状态
      if (queryLower.includes("进行中")) {
        params.status = "进行中";
      } else if (queryLower.includes("已完成")) {
        params.status = "已完成";
      } else if (queryLower.includes("计划中")) {
        params.status = "计划中";
      }
      break;

    case "get_tasks":
      // 提取任务过滤条件
      if (queryLower.includes("高优先级")) {
        params.priority = "高";
      } else if (queryLower.includes("中优先级")) {
        params.priority = "中";
      } else if (queryLower.includes("低优先级")) {
        params.priority = "低";
      }

      const assigneeMatch = queryLower.match(/(?:分配给|由)\s*(\w+)\s*(?:负责|处理)/);
      if (assigneeMatch && assigneeMatch[1]) {
        params.assignee = assigneeMatch[1];
      }
      break;
  }

  return params;
}

// ================== 工具执行 ==================

// 执行工具调用
export async function executeTool(tool, params) {
  try {
    console.log(C.cyan + `🛠️ 执行工具: ${tool.name}` + C.reset);
    console.log(C.dim + `🔧 参数: ${JSON.stringify(params)}` + C.reset);

    let url = `${API_BASE_URL}${tool.endpoint}`;
    let response;

    // 构建请求
    if (tool.method === "GET") {
      // 替换URL中的参数
      if (tool.endpoint.includes(":id") && params.id) {
        url = url.replace(":id", params.id);
        delete params.id;
      }

      // 添加查询参数
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, value);
        }
      });

      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      console.log(C.dim + `🔗 请求URL: ${url}` + C.reset);
      response = await axios.get(url);
    } else {
      // 目前只支持GET方法
      throw new Error(`不支持的HTTP方法: ${tool.method}`);
    }

    if (response.data.success !== false) {
      console.log(C.green + `✅ 工具执行成功` + C.reset);
      return {
        success: true,
        tool: tool.name,
        data: response.data.data || response.data,
        raw: response.data
      };
    } else {
      console.log(C.magenta + `❌ 工具执行失败: ${response.data.message || "未知错误"}` + C.reset);
      return {
        success: false,
        tool: tool.name,
        error: response.data.message || "未知错误",
        raw: response.data
      };
    }
  } catch (error) {
    console.error(C.magenta + `❌ 工具调用异常: ${error.message}` + C.reset);

    // 检查是否是API服务器未启动
    if (error.code === "ECONNREFUSED") {
      console.log(C.yellow + `⚠️ API服务器可能未启动，请运行: node api_server.js` + C.reset);
    }

    return {
      success: false,
      tool: tool.name,
      error: error.message,
      stack: error.stack
    };
  }
}

// ================== 智能工具调用 ==================

// 智能工具调用主函数
export async function intelligentToolCall(query) {
  console.log(C.cyan + "\n🤖 分析是否需要工具调用..." + C.reset);

  // 1. 判断是否需要工具调用
  if (!shouldUseTool(query)) {
    console.log(C.green + "📝 判断为普通问题，无需工具调用" + C.reset);
    return null;
  }

  // 2. 选择工具
  const tool = selectTool(query);
  if (!tool) {
    console.log(C.magenta + "⚠️ 无法匹配到合适工具" + C.reset);
    return null;
  }

  console.log(C.green + `🔧 选择工具: ${tool.name} (${tool.description})` + C.reset);

  // 3. 提取参数
  const params = extractToolParameters(query, tool);
  console.log(C.dim + `📝 提取参数: ${JSON.stringify(params)}` + C.reset);

  // 检查必要参数（只有required为true才是必须的）
  const requiredParams = Object.keys(tool.parameters).filter(
    key => tool.parameters[key].required === true
  );

  for (const param of requiredParams) {
    if (params[param] === undefined || params[param] === "") {
      console.log(C.magenta + `⚠️ 缺少必要参数: ${param}` + C.reset);
      console.log(C.dim + `💡 参数说明: ${tool.parameters[param].description}` + C.reset);
      return null;
    }
  }

  // 4. 执行工具
  const result = await executeTool(tool, params);

  return result;
}

// ================== 工具结果格式化 ==================

// 格式化工具调用结果
export function formatToolResult(result) {
  if (!result || !result.success) {
    return "工具调用失败，无法获取结果";
  }

  const { tool, data } = result;

  switch (tool) {
    case "calculate":
      return `计算结果：${data.expression} = ${data.result}`;

    case "convert":
      return `转换结果：${data.value} ${data.from} = ${data.result.toFixed(2)} ${data.to}`;

    case "get_users":
      if (Array.isArray(data)) {
        return `找到 ${data.length} 个用户：\n` +
          data.map(u => `  • ${u.name} (${u.role}, ${u.department})`).join("\n");
      }
      return `用户信息：${JSON.stringify(data, null, 2)}`;

    case "get_projects":
      if (Array.isArray(data)) {
        return `找到 ${data.length} 个项目：\n` +
          data.map(p => `  • ${p.name} (状态: ${p.status}, 进度: ${p.progress}%)`).join("\n");
      }
      return `项目信息：${JSON.stringify(data, null, 2)}`;

    case "get_tasks":
      if (Array.isArray(data)) {
        return `找到 ${data.length} 个任务：\n` +
          data.map(t => `  • ${t.title} (分配: ${t.assignee}, 优先级: ${t.priority})`).join("\n");
      }
      return `任务信息：${JSON.stringify(data, null, 2)}`;

    case "get_company_info":
      return `公司信息：${data.name}\n成立时间：${data.founded}\n员工数：${data.employees}\n部门：${data.departments.join(", ")}`;

    case "get_company_metrics":
      return `公司指标：\n月收入：${data.monthlyRevenue.toLocaleString()}元\n活跃项目：${data.activeProjects}个\n员工满意度：${data.employeeSatisfaction}/5`;

    case "get_system_status":
      return `系统状态：${data.server}\n运行时间：${Math.floor(data.uptime)}秒\n内存使用：${Math.round(data.memory.heapUsed / 1024 / 1024)}MB`;

    default:
      return `工具调用结果：${JSON.stringify(data, null, 2)}`;
  }
}

// ================== 导出 ==================

export default {
  TOOLS,
  ToolType,
  shouldUseTool,
  selectTool,
  extractToolParameters,
  executeTool,
  intelligentToolCall,
  formatToolResult
};