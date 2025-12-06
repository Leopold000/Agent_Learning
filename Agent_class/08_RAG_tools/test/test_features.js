/**
 * 功能测试脚本
 * 测试智能助手的各种功能
 */

import { createSmartAgent } from "../lib/main.js";

// 测试不同功能
async function testFeatures() {
  console.log("🧪 开始测试智能助手功能...\n");

  try {
    // 创建代理
    console.log("1️⃣ 创建智能助手代理...");
    const agent = await createSmartAgent();
    if (!agent) {
      console.log("❌ 代理创建失败");
      return;
    }
    console.log("✅ 代理创建成功\n");

    // 测试用例
    const testCases = [
      {
        input: "公司有哪些员工？",
        description: "查询用户信息",
      },
      {
        input: "进行中的项目有哪些？",
        description: "查询项目信息",
      },
      {
        input: "计算一下2+3*4",
        description: "数学计算",
      },
    ];

    // 逐个测试
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${i + 2}️⃣ 测试: ${testCase.description}`);
      console.log(`   输入: ${testCase.input}`);

      try {
        // 流式处理输入
        let result = "";
        for await (const chunk of agent.streamInput(testCase.input)) {
          result += chunk;
        }

        console.log(`   ✅ 执行成功`);
        console.log(
          `   输出: ${result.substring(0, 100)}${
            result.length > 100 ? "..." : ""
          }`
        );
      } catch (error) {
        console.log(`   ❌ 执行失败: ${error.message}`);
      }
    }

    console.log("\n🎉 测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 运行测试
testFeatures();
