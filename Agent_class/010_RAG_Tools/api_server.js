import express from 'express';
import cors from 'cors';

// 创建Express应用
const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// Mock数据
const mockData = {
  users: [
    { id: 1, name: '张三', role: '开发工程师', department: '技术部', email: 'zhangsan@company.com' },
    { id: 2, name: '李四', role: '测试工程师', department: '质量部', email: 'lisi@company.com' },
    { id: 3, name: '王五', role: '产品经理', department: '产品部', email: 'wangwu@company.com' },
    { id: 4, name: '赵六', role: 'UI设计师', department: '设计部', email: 'zhaoliu@company.com' },
  ],

  projects: [
    { id: 1, name: '电商平台升级', status: '进行中', leader: '张三', deadline: '2024-12-31', progress: 65 },
    { id: 2, name: '移动端App开发', status: '已完成', leader: '李四', deadline: '2024-11-30', progress: 100 },
    { id: 3, name: '数据中台建设', status: '进行中', leader: '王五', deadline: '2025-03-31', progress: 30 },
    { id: 4, name: '内部管理系统', status: '计划中', leader: '赵六', deadline: '2025-06-30', progress: 10 },
  ],

  tasks: [
    { id: 1, title: '用户登录模块开发', assignee: '张三', project: '电商平台升级', priority: '高', dueDate: '2024-12-15' },
    { id: 2, title: '支付接口测试', assignee: '李四', project: '电商平台升级', priority: '中', dueDate: '2024-12-20' },
    { id: 3, title: '需求文档编写', assignee: '王五', project: '数据中台建设', priority: '中', dueDate: '2025-01-15' },
    { id: 4, title: 'UI设计稿审核', assignee: '赵六', project: '内部管理系统', priority: '低', dueDate: '2025-02-28' },
  ],

  companyInfo: {
    name: '创新科技公司',
    founded: '2018年',
    employees: 150,
    departments: ['技术部', '产品部', '设计部', '市场部', '行政部'],
    location: '北京市海淀区',
    website: 'www.innotech.com'
  },

  metrics: {
    monthlyRevenue: 2500000,
    activeProjects: 8,
    completedProjects: 15,
    employeeSatisfaction: 4.2,
    customerSatisfaction: 4.5
  }
};

// ================== API路由 ==================

// 1. 用户相关API
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: mockData.users,
    count: mockData.users.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = mockData.users.find(u => u.id === id);

  if (user) {
    res.json({ success: true, data: user });
  } else {
    res.status(404).json({ success: false, message: '用户未找到' });
  }
});

app.get('/api/users/search/:name', (req, res) => {
  const name = req.params.name.toLowerCase();
  const users = mockData.users.filter(u =>
    u.name.toLowerCase().includes(name) ||
    u.email.toLowerCase().includes(name)
  );

  res.json({ success: true, data: users, count: users.length });
});

// 2. 项目相关API
app.get('/api/projects', (req, res) => {
  const { status } = req.query;
  let projects = mockData.projects;

  if (status) {
    projects = projects.filter(p => p.status === status);
  }

  res.json({
    success: true,
    data: projects,
    count: projects.length,
    stats: {
      inProgress: mockData.projects.filter(p => p.status === '进行中').length,
      completed: mockData.projects.filter(p => p.status === '已完成').length,
      planned: mockData.projects.filter(p => p.status === '计划中').length
    }
  });
});

app.get('/api/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const project = mockData.projects.find(p => p.id === id);

  if (project) {
    // 获取项目相关任务
    const tasks = mockData.tasks.filter(t => t.project === project.name);
    res.json({
      success: true,
      data: { ...project, tasks }
    });
  } else {
    res.status(404).json({ success: false, message: '项目未找到' });
  }
});

// 3. 任务相关API
app.get('/api/tasks', (req, res) => {
  const { assignee, priority, project } = req.query;
  let tasks = mockData.tasks;

  if (assignee) {
    tasks = tasks.filter(t => t.assignee === assignee);
  }

  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }

  if (project) {
    tasks = tasks.filter(t => t.project === project);
  }

  res.json({
    success: true,
    data: tasks,
    count: tasks.length,
    stats: {
      highPriority: tasks.filter(t => t.priority === '高').length,
      mediumPriority: tasks.filter(t => t.priority === '中').length,
      lowPriority: tasks.filter(t => t.priority === '低').length
    }
  });
});

// 4. 公司信息API
app.get('/api/company', (req, res) => {
  res.json({
    success: true,
    data: mockData.companyInfo
  });
});

app.get('/api/company/metrics', (req, res) => {
  res.json({
    success: true,
    data: mockData.metrics,
    updatedAt: new Date().toISOString()
  });
});

// 5. 工具函数API（模拟计算、转换等）
app.get('/api/tools/calculate', (req, res) => {
  const { expression } = req.query;

  if (!expression) {
    return res.status(400).json({ success: false, message: '缺少表达式参数' });
  }

  try {
    // 简单的表达式计算（注意：生产环境需要更安全的计算）
    const result = eval(expression); // 仅用于演示，生产环境请使用安全计算库
    res.json({
      success: true,
      data: {
        expression,
        result,
        type: typeof result
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '计算失败',
      error: error.message
    });
  }
});

app.get('/api/tools/convert', (req, res) => {
  const { value, from, to } = req.query;

  if (!value || !from || !to) {
    return res.status(400).json({
      success: false,
      message: '缺少参数：value, from, to'
    });
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return res.status(400).json({
      success: false,
      message: 'value必须是数字'
    });
  }

  // 简单的单位转换
  const conversions = {
    temperature: {
      celsius_to_fahrenheit: (c) => c * 9/5 + 32,
      fahrenheit_to_celsius: (f) => (f - 32) * 5/9
    },
    length: {
      meters_to_feet: (m) => m * 3.28084,
      feet_to_meters: (ft) => ft / 3.28084,
      kilometers_to_miles: (km) => km * 0.621371,
      miles_to_kilometers: (mi) => mi / 0.621371
    },
    currency: {
      usd_to_cny: (usd) => usd * 7.2, // 模拟汇率
      cny_to_usd: (cny) => cny / 7.2
    }
  };

  const conversionKey = `${from}_to_${to}`.toLowerCase();
  let result = null;
  let category = null;

  // 查找对应的转换函数
  for (const [cat, funcs] of Object.entries(conversions)) {
    if (funcs[conversionKey]) {
      result = funcs[conversionKey](numValue);
      category = cat;
      break;
    }
  }

  if (result === null) {
    return res.status(400).json({
      success: false,
      message: `不支持从 ${from} 到 ${to} 的转换`,
      supportedConversions: Object.keys(conversions).map(cat => ({
        category: cat,
        conversions: Object.keys(conversions[cat])
      }))
    });
  }

  res.json({
    success: true,
    data: {
      value: numValue,
      from,
      to,
      result,
      category
    }
  });
});

// 6. 系统状态API
app.get('/api/system/status', (req, res) => {
  res.json({
    success: true,
    data: {
      server: '运行中',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      apiCount: Object.keys(mockData).length,
      endpoints: [
        '/api/users',
        '/api/projects',
        '/api/tasks',
        '/api/company',
        '/api/tools/calculate',
        '/api/tools/convert',
        '/api/system/status'
      ]
    }
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'Mock API Server for RAG Tools Agent',
    version: '1.0.0',
    endpoints: {
      users: ['GET /api/users', 'GET /api/users/:id', 'GET /api/users/search/:name'],
      projects: ['GET /api/projects', 'GET /api/projects/:id'],
      tasks: ['GET /api/tasks'],
      company: ['GET /api/company', 'GET /api/company/metrics'],
      tools: ['GET /api/tools/calculate', 'GET /api/tools/convert'],
      system: ['GET /api/system/status', 'GET /health']
    },
    usage: '这个API服务器为08_RAG_tools提供模拟数据，Agent可以通过function calling调用这些API'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 Mock API服务器启动成功！');
  console.log(`📡 地址: http://localhost:${PORT}`);
  console.log('📋 可用端点:');
  console.log('  - GET /              : 服务器信息');
  console.log('  - GET /health        : 健康检查');
  console.log('  - GET /api/users     : 用户列表');
  console.log('  - GET /api/projects  : 项目列表');
  console.log('  - GET /api/tasks     : 任务列表');
  console.log('  - GET /api/company   : 公司信息');
  console.log('  - GET /api/tools/*   : 工具函数');
  console.log('  - GET /api/system/status : 系统状态');
  console.log('\n💡 这个服务器为RAG Agent提供可调用的tools功能');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 收到中断信号，关闭服务器...');
  process.exit(0);
});

export default app;