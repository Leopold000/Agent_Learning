/**
 * 知识库搜索测试脚本
 * 测试修复后的知识库搜索功能
 */

import { createSmartAgent } from "../lib/main.js";

async function testKnowledgeSearch() {
  console.log("🔍 知识库搜索功能测试...\n");

  // 创建智能助手实例
  const agent = await createSmartAgent();
  if (!agent) {
    console.log("❌ 智能助手创建失败");
    return;
  }

  console.log("✅ 智能助手创建成功\n");

  // 测试知识库搜索
  const testQuery = "自定义的加法函数在哪";
  console.log(`🔍 测试查询: ${testQuery}`);

  try {
    console.log("🤖 助手回应:");

    // 流式输出结果
    let response = "";
    for await (const chunk of agent.streamInput(testQuery)) {
      process.stdout.write(chunk);
      response += chunk;
    }

    console.log(); // 添加换行

    // 检查是否成功调用了知识库搜索
    if (
      response.includes("知识库检索完成") ||
      response.includes("searchKnowledgeBase")
    ) {
      console.log("\n✅ 知识库搜索功能测试成功！");
    } else {
      console.log("\n⚠️ 知识库搜索可能未正确触发");
    }
  } catch (error) {
    console.log(`\n❌ 测试失败: ${error.message}`);
  }

  console.log("\n🎉 测试完成！");
}

// 运行测试
testKnowledgeSearch().catch((error) => {
  console.error("测试出错:", error);
});
