// 快速测试修复后的工具调用
import {
  intelligentToolCall,
  formatToolResult,
  selectTool
} from "./tool_manager.js";

// 颜色
const C = {
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m",
};

async function testQuery(query) {
  console.log(C.cyan + `\n🧪 测试: "${query}"` + C.reset);

  // 测试工具选择
  const tool = selectTool(query);
  if (tool) {
    console.log(C.green + `🔧 选择工具: ${tool.name}` + C.reset);
    console.log(C.dim + `📝 描述: ${tool.description}` + C.reset);
  } else {
    console.log(C.magenta + "❌ 未找到合适工具" + C.reset);
  }

  // 测试工具调用
  const result = await intelligentToolCall(query);
  if (result) {
    if (result.success) {
      const formatted = formatToolResult(result);
      console.log(C.green + "✅ 工具调用成功:" + C.reset);
      console.log(formatted);
    } else {
      console.log(C.magenta + `❌ 工具调用失败: ${result.error}` + C.reset);
    }
  } else {
    console.log(C.magenta + "❌ 工具调用失败或未找到合适工具" + C.reset);
  }
}

async function main() {
  console.log(C.cyan + "\n🚀 快速测试修复后的工具调用" + C.reset);

  const testQueries = [
    // 计算类
    "计算sin(30)",
    "10*5+2等于多少",

    // 转换类
    "20摄氏度等于多少华氏度",
    "100美元等于多少人民币",

    // 数据查询类
    "公司信息",
    "有哪些用户",

    // 系统类
    "系统状态"
  ];

  for (const query of testQueries) {
    await testQuery(query);
    console.log(C.dim + "─".repeat(50) + C.reset);
  }

  console.log(C.green + "\n🎉 测试完成！" + C.reset);
}

main().catch(error => {
  console.error(C.magenta + "❌ 测试失败: " + error.message + C.reset);
  console.error(error.stack);
  process.exit(1);
});