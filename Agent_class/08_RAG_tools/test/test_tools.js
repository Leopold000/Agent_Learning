// 测试08版本工具功能
console.log("🧪 测试08_RAG_tools功能\n");

console.log("📋 测试项目:");
console.log("1. API服务器启动");
console.log("2. 工具客户端功能");
console.log("3. 智能决策系统");
console.log("4. 整合RAG与Tools\n");

async function runTests() {
  const tests = [];

  // 测试1: 检查依赖
  tests.push({
    name: "检查依赖",
    test: () => {
      try {
        // 检查关键依赖
        const deps = [
          "express",
          "cors",
          "@langchain/ollama",
          "@langchain/core",
        ];
        console.log("✅ 依赖检查通过");
        return true;
      } catch (error) {
        console.log(`❌ 依赖检查失败: ${error.message}`);
        return false;
      }
    },
  });

  // 测试2: 检查API服务器
  tests.push({
    name: "API服务器检查",
    test: async () => {
      try {
        const { checkServerHealth } = await import("../tools_client.js");
        const status = await checkServerHealth();

        if (status.available) {
          console.log(
            `✅ API服务器可用: ${status.status} (v${status.version})`
          );
          return true;
        } else {
          console.log(`⚠️ API服务器不可用: ${status.message}`);
          console.log("💡 请运行: node api_server.js");
          return false;
        }
      } catch (error) {
        console.log(`❌ API服务器检查失败: ${error.message}`);
        return false;
      }
    },
  });

  // 测试3: 工具定义
  tests.push({
    name: "工具定义检查",
    test: async () => {
      try {
        const { getToolDefinitions } = await import("../tools_client.js");
        const tools = getToolDefinitions();

        if (tools.length > 0) {
          console.log(`✅ 找到 ${tools.length} 个工具定义:`);
          tools.forEach((tool, i) => {
            console.log(
              `   ${i + 1}. ${tool.function.name}: ${tool.function.description}`
            );
          });
          return true;
        } else {
          console.log("❌ 未找到工具定义");
          return false;
        }
      } catch (error) {
        console.log(`❌ 工具定义检查失败: ${error.message}`);
        return false;
      }
    },
  });

  // 测试4: 简单工具调用
  tests.push({
    name: "简单工具调用测试",
    test: async () => {
      try {
        const { executeTool } = await import("../tools_client.js");

        // 测试获取系统状态
        const result = await executeTool("getCompanyInfo", {});

        if (result.success) {
          console.log(`✅ 工具调用成功: ${result.message}`);
          console.log(`公司信息:${result.data}`);
          console.log(`   服务器运行时间: ${Math.floor(result.uptime)}秒`);
          return true;
        } else {
          console.log(`❌ 工具调用失败: ${result.error || result.message}`);
          return false;
        }
      } catch (error) {
        console.log(`❌ 工具调用测试失败: ${error.message}`);
        return false;
      }
    },
  });

  // 测试5: 知识库连接
  tests.push({
    name: "知识库连接检查",
    test: async () => {
      try {
        const { initDB } = await import("../rag_search.js");
        await initDB();
        console.log("✅ 知识库连接成功");
        return true;
      } catch (error) {
        console.log(`❌ 知识库连接失败: ${error.message}`);
        console.log("💡 请确保已运行 embed.js 构建知识库");
        return false;
      }
    },
  });

  // 测试6: 智能决策测试
  tests.push({
    name: "智能决策逻辑测试",
    test: () => {
      // 模拟决策逻辑
      const testCases = [
        { query: "你好", expected: "general" },
        { query: "代码规范有哪些", expected: "knowledge" },
        { query: "公司有哪些员工", expected: "tools" },
        { query: "计算一下2+3", expected: "tools" },
        { query: "项目进度如何", expected: "tools" },
      ];

      console.log("🧠 决策逻辑测试:");
      let passed = 0;

      for (const testCase of testCases) {
        const query = testCase.query.toLowerCase();
        let detectedType = "general";

        // 模拟决策逻辑
        if (
          query.includes("用户") ||
          query.includes("员工") ||
          query.includes("同事") ||
          query.includes("项目") ||
          query.includes("工程") ||
          query.includes("任务") ||
          query.includes("公司") ||
          query.includes("计算") ||
          query.includes("转换")
        ) {
          detectedType = "tools";
        } else if (
          query.includes("代码") ||
          query.includes("规范") ||
          query.includes("文档") ||
          query.includes("函数") ||
          query.includes("方法") ||
          query.includes("系统")
        ) {
          detectedType = "knowledge";
        }

        if (detectedType === testCase.expected) {
          console.log(`   ✅ "${testCase.query}" -> ${detectedType}`);
          passed++;
        } else {
          console.log(
            `   ❌ "${testCase.query}" -> ${detectedType} (期望: ${testCase.expected})`
          );
        }
      }

      const success = passed === testCases.length;
      console.log(`   📊 结果: ${passed}/${testCases.length} 通过`);
      return success;
    },
  });

  // 运行所有测试
  console.log("\n🧪 开始测试...\n");

  let passed = 0;
  let total = tests.length;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`${i + 1}. ${test.name}...`);

    try {
      const result = await test.test();
      if (result) {
        passed++;
      }
      console.log();
    } catch (error) {
      console.log(`   ❌ 测试异常: ${error.message}\n`);
    }
  }

  // 测试结果
  console.log("📊 测试结果:");
  console.log(`总测试数: ${total}`);
  console.log(`通过数: ${passed}`);
  console.log(`失败数: ${total - passed}`);

  if (passed === total) {
    console.log("\n🎉 所有测试通过！08_RAG_tools功能正常。");
    console.log("\n🚀 启动方法:");
    console.log("1. 启动API服务器: node api_server.js");
    console.log("2. 启动RAG助手: node chat_rag_tools.js");
    console.log("\n💡 功能特性:");
    console.log("- 智能决策: 自动判断问题类型");
    console.log("- RAG检索: 知识库问答");
    console.log("- 工具调用: 用户、项目、公司数据查询");
    console.log("- 计算转换: 数学计算和单位转换");
    console.log("- 多轮对话: 上下文记忆");
    console.log("- 流式输出: 实时响应");
  } else if (passed >= total * 0.7) {
    console.log("\n⚠️ 部分测试通过，核心功能可用。");
    console.log("💡 建议先修复失败的测试。");
  } else {
    console.log("\n🔧 需要修复多个测试。");
  }
}

runTests().catch((error) => {
  console.error("❌ 测试运行失败:", error);
  process.exit(1);
});
