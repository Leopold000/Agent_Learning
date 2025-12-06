// 测试修复版本的工具调用
console.log("🧪 测试修复版本的工具调用\n");

async function testToolExecution() {
  try {
    const { executeTool, checkServerHealth } = await import(
      "../tools_client.js"
    );

    // 1. 检查API服务器
    console.log("1️⃣ 检查API服务器...");
    const serverStatus = await checkServerHealth();
    if (!serverStatus.available) {
      console.log("❌ API服务器不可用，请先运行: node api_server.js");
      return;
    }
    console.log(`✅ API服务器可用: ${serverStatus.status}`);

    // 2. 测试简单工具调用
    console.log("\n2️⃣ 测试工具调用...");

    const testCases = [
      {
        tool: "getSystemStatus",
        params: {},
        description: "系统状态检查",
      },
      {
        tool: "getUsers",
        params: {},
        description: "获取用户列表",
      },
      {
        tool: "getCompanyInfo",
        params: { includeMetrics: true },
        description: "获取公司信息（含指标）",
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n🔧 测试: ${testCase.description}`);
      console.log(`   工具: ${testCase.tool}`);
      console.log(`   参数: ${JSON.stringify(testCase.params)}`);

      const result = await executeTool(testCase.tool, testCase.params);

      if (result.success) {
        console.log(`   ✅ 成功: ${result.message}`);
        if (result.count) {
          console.log(`      数量: ${result.count}`);
        }
        if (
          result.data &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          console.log(`      示例: ${JSON.stringify(result.data[0])}`);
        }
      } else {
        console.log(`   ❌ 失败: ${result.error || result.message}`);
      }
    }

    // 3. 测试参数提取逻辑
    console.log("\n3️⃣ 测试参数提取逻辑...");

    const paramTestCases = [
      {
        query: "查询一下张三的信息",
        expectedTool: "get_users",
        expectedParams: { searchName: "张三" },
      },
      {
        query: "进行中的项目有哪些",
        expectedTool: "get_projects",
        expectedParams: { status: "进行中" },
      },
      {
        query: "计算2+3*4",
        expectedTool: "calculate",
        expectedParams: { expression: "2+3*4" },
      },
    ];

    // 导入参数提取函数（需要从主文件导出）
    console.log("💡 参数提取测试需要运行完整程序测试");

    console.log("\n🎉 基础工具调用测试完成！");
    console.log("\n🚀 下一步:");
    console.log("1. 启动API服务器: node api_server.js");
    console.log("2. 启动修复版助手: node chat_rag_tools_fixed.js");
    console.log("3. 尝试以下问题:");
    console.log('   - "公司有哪些员工？"');
    console.log('   - "进行中的项目有哪些？"');
    console.log('   - "计算一下2+3*4"');
    console.log('   - "代码规范有哪些要求？"');
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testToolExecution();
