/**
 * 多轮对话演示脚本
 * 演示智能助手的多轮对话和记忆功能
 */

import { createSmartAgent } from "./lib/main.js";

async function demoConversation() {
  console.log("🎭 多轮对话演示开始...\n");

  // 创建智能助手实例
  const agent = await createSmartAgent();
  if (!agent) {
    console.log("❌ 智能助手创建失败");
    return;
  }

  console.log("✅ 智能助手创建成功\n");

  // 模拟多轮对话
  const conversation = [
    "你好！",
    "公司有哪些员工？",
    "张三是做什么工作的？",
    "计算一下他们的平均年龄",
    "谢谢你的帮助！"
  ];

  // 逐句处理对话
  for (let i = 0; i < conversation.length; i++) {
    const userMessage = conversation[i];
    console.log(`\n👤 用户: ${userMessage}`);

    try {
      console.log("🤖 助手: ");

      // 流式输出结果
      let response = '';
      for await (const chunk of agent.streamInput(userMessage)) {
        process.stdout.write(chunk);
        response += chunk;
      }

      console.log(); // 添加换行
    } catch (error) {
      console.log(`❌ 处理消息时出错: ${error.message}`);
    }
  }

  console.log("\n🎉 演示完成！");
}

// 运行演示
demoConversation().catch(error => {
  console.error("演示出错:", error);
});