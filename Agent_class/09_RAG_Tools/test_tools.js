// 测试工具调用功能
import {
  intelligentToolCall,
  formatToolResult,
  shouldUseTool
} from "./tool_manager.js";

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

async function testTool(query) {
  console.log(C.cyan + `\n🧪 测试查询: "${query}"` + C.reset);

  // 1. 判断是否需要工具调用
  const needsTool = shouldUseTool(query);
  console.log(C.dim + `🔧 是否需要工具调用: ${needsTool}` + C.reset);

  if (!needsTool) {
    console.log(C.magenta + "❌ 判断为不需要工具调用" + C.reset);
    return;
  }

  // 2. 执行工具调用
  console.log(C.dim + "🛠️ 执行工具调用..." + C.reset);
  const result = await intelligentToolCall(query);

  // 3. 显示结果
  if (result) {
    console.log(C.green + "✅ 工具调用完成" + C.reset);
    console.log(C.dim + `📊 工具: ${result.tool}` + C.reset);
    console.log(C.dim + `🎯 成功: ${result.success}` + C.reset);

    if (result.success) {
      const formatted = formatToolResult(result);
      console.log(C.green + "📋 格式化结果:" + C.reset);
      console.log(formatted);
    } else {
      console.log(C.magenta + `❌ 错误: ${result.error}` + C.reset);
    }
  } else {
    console.log(C.magenta + "❌ 工具调用失败或未找到合适工具" + C.reset);
  }
}

async function main() {
  console.log(C.cyan + "\n🚀 开始测试工具调用功能" + C.reset);
  console.log(C.dim + "🔗 API服务器: http://localhost:3000" + C.reset);

  // 测试各种工具调用
  const testQueries = [
    // 计算类
    "2+3等于多少",
    "计算sin(30)",
    "10*5+2",

    // 转换类
    "20摄氏度等于多少华氏度",
    "100美元等于多少人民币",
    "5米等于多少英尺",

    // 数据查询类
    "有哪些用户",
    "张三的信息",
    "项目列表",
    "任务列表",
    "公司信息",

    // 系统类
    "系统状态",

    // 不需要工具调用的
    "你好",
    "今天天气怎么样"
  ];

  for (const query of testQueries) {
    await testTool(query);
    console.log(C.dim + "─".repeat(50) + C.reset);
  }

  console.log(C.green + "\n🎉 测试完成！" + C.reset);
}

main().catch(error => {
  console.error(C.magenta + "❌ 测试失败: " + error.message + C.reset);
  console.error(error.stack);
  process.exit(1);
});