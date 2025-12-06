// Tools客户端 - 为Agent提供function calling功能
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

// 工具函数集合
const tools = {
  // 1. 用户相关工具
  getUsers: {
    name: 'get_users',
    description: '获取所有用户列表，或根据条件搜索用户',
    parameters: {
      type: 'object',
      properties: {
        searchName: {
          type: 'string',
          description: '搜索用户名或邮箱（可选）'
        },
        userId: {
          type: 'number',
          description: '获取特定用户ID的信息（可选）'
        }
      }
    },
    execute: async ({ searchName, userId }) => {
      try {
        let url = `${API_BASE_URL}/api/users`;

        if (userId) {
          url = `${API_BASE_URL}/api/users/${userId}`;
        } else if (searchName) {
          url = `${API_BASE_URL}/api/users/search/${encodeURIComponent(searchName)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        return {
          success: data.success,
          data: data.data,
          message: userId ? `获取用户ID ${userId} 的信息` :
                  searchName ? `搜索用户 "${searchName}" 的结果` :
                  '获取所有用户列表',
          count: data.count || (Array.isArray(data.data) ? data.data.length : 1)
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: '获取用户信息失败'
        };
      }
    }
  },

  // 2. 项目相关工具
  getProjects: {
    name: 'get_projects',
    description: '获取项目列表，可以按状态过滤',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: '项目状态：进行中、已完成、计划中（可选）',
          enum: ['进行中', '已完成', '计划中']
        },
        projectId: {
          type: 'number',
          description: '获取特定项目ID的详细信息（可选）'
        }
      }
    },
    execute: async ({ status, projectId }) => {
      try {
        let url = `${API_BASE_URL}/api/projects`;

        if (projectId) {
          url = `${API_BASE_URL}/api/projects/${projectId}`;
        } else if (status) {
          url = `${API_BASE_URL}/api/projects?status=${encodeURIComponent(status)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        return {
          success: data.success,
          data: data.data,
          message: projectId ? `获取项目ID ${projectId} 的详细信息` :
                  status ? `获取${status}状态的项目列表` :
                  '获取所有项目列表',
          stats: data.stats,
          count: data.count || (Array.isArray(data.data) ? data.data.length : 1)
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: '获取项目信息失败'
        };
      }
    }
  },

  // 3. 任务相关工具
  getTasks: {
    name: 'get_tasks',
    description: '获取任务列表，可以按分配人、优先级或项目过滤',
    parameters: {
      type: 'object',
      properties: {
        assignee: {
          type: 'string',
          description: '任务分配人姓名（可选）'
        },
        priority: {
          type: 'string',
          description: '任务优先级：高、中、低（可选）',
          enum: ['高', '中', '低']
        },
        project: {
          type: 'string',
          description: '所属项目名称（可选）'
        }
      }
    },
    execute: async ({ assignee, priority, project }) => {
      try {
        let url = `${API_BASE_URL}/api/tasks`;
        const params = new URLSearchParams();

        if (assignee) params.append('assignee', assignee);
        if (priority) params.append('priority', priority);
        if (project) params.append('project', project);

        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        let message = '获取任务列表';
        if (assignee || priority || project) {
          const filters = [];
          if (assignee) filters.push(`分配人: ${assignee}`);
          if (priority) filters.push(`优先级: ${priority}`);
          if (project) filters.push(`项目: ${project}`);
          message = `获取任务列表（过滤条件: ${filters.join(', ')})`;
        }

        return {
          success: data.success,
          data: data.data,
          message,
          stats: data.stats,
          count: data.count || (Array.isArray(data.data) ? data.data.length : 0)
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: '获取任务信息失败'
        };
      }
    }
  },

  // 4. 公司信息工具
  getCompanyInfo: {
    name: 'get_company_info',
    description: '获取公司基本信息',
    parameters: {
      type: 'object',
      properties: {
        includeMetrics: {
          type: 'boolean',
          description: '是否包含公司指标数据（可选，默认false）'
        }
      }
    },
    execute: async ({ includeMetrics = false }) => {
      try {
        let url = `${API_BASE_URL}/api/company`;
        let data;

        const response = await fetch(url);
        const companyData = await response.json();

        if (includeMetrics) {
          const metricsResponse = await fetch(`${API_BASE_URL}/api/company/metrics`);
          const metricsData = await metricsResponse.json();
          data = {
            ...companyData.data,
            metrics: metricsData.data
          };
        } else {
          data = companyData.data;
        }

        return {
          success: true,
          data,
          message: includeMetrics ? '获取公司信息及指标数据' : '获取公司基本信息',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: '获取公司信息失败'
        };
      }
    }
  },

  // 5. 计算工具
  calculate: {
    name: 'calculate',
    description: '执行数学计算，支持加减乘除等基本运算',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，如 "2 + 3 * 4"、"sqrt(16)" 等'
        }
      },
      required: ['expression']
    },
    execute: async ({ expression }) => {
      try {
        const url = `${API_BASE_URL}/api/tools/calculate?expression=${encodeURIComponent(expression)}`;
        const response = await fetch(url);
        const data = await response.json();

        return {
          success: data.success,
          data: data.data,
          message: `计算表达式: ${expression}`,
          rawResult: data.data?.result
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: '计算失败'
        };
      }
    }
  },

  // 6. 单位转换工具
  convertUnits: {
    name: 'convert_units',
    description: '单位转换，支持温度、长度、货币等',
    parameters: {
      type: 'object',
      properties: {
        value: {
          type: 'number',
          description: '需要转换的数值'
        },
        from: {
          type: 'string',
          description: '原始单位，如 "celsius"、"meters"、"USD"'
        },
        to: {
          type: 'string',
          description: '目标单位，如 "fahrenheit"、"feet"、"CNY"'
        }
      },
      required: ['value', 'from', 'to']
    },
    execute: async ({ value, from, to }) => {
      try {
        const url = `${API_BASE_URL}/api/tools/convert?value=${value}&from=${from}&to=${to}`;
        const response = await fetch(url);
        const data = await response.json();

        return {
          success: data.success,
          data: data.data,
          message: `单位转换: ${value} ${from} → ${to}`,
          rawResult: data.data?.result
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: '单位转换失败'
        };
      }
    }
  },

  // 7. 系统状态工具
  getSystemStatus: {
    name: 'get_system_status',
    description: '获取API服务器状态和运行信息',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async () => {
      try {
        const url = `${API_BASE_URL}/api/system/status`;
        const response = await fetch(url);
        const data = await response.json();

        return {
          success: data.success,
          data: data.data,
          message: '获取系统状态',
          uptime: data.data?.uptime,
          timestamp: data.data?.timestamp
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: '获取系统状态失败',
          serverAvailable: false
        };
      }
    }
  }
};

// 工具执行器
async function executeTool(toolName, parameters) {
  const tool = tools[toolName];

  if (!tool) {
    return {
      success: false,
      error: `工具未找到: ${toolName}`,
      availableTools: Object.keys(tools)
    };
  }

  try {
    console.log(`🛠️  执行工具: ${tool.name}`);
    console.log(`📋 参数: ${JSON.stringify(parameters, null, 2)}`);

    const result = await tool.execute(parameters);

    console.log(`✅ 工具执行完成: ${tool.name}`);
    return result;
  } catch (error) {
    console.error(`❌ 工具执行失败: ${tool.name}`, error);
    return {
      success: false,
      error: error.message,
      tool: tool.name,
      message: '工具执行过程中出错'
    };
  }
}

// 获取所有工具定义（用于function calling）
function getToolDefinitions() {
  return Object.values(tools).map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

// 检查API服务器是否可用
async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return {
      available: true,
      status: data.status,
      version: data.version,
      timestamp: data.timestamp
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      message: 'API服务器不可用，请确保api_server.js正在运行'
    };
  }
}

export {
  tools,
  executeTool,
  getToolDefinitions,
  checkServerHealth,
  API_BASE_URL
};