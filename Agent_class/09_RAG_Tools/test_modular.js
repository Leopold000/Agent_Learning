// 测试模块化版本的功能
import { initDB, search } from "./rag_search.js";
import { intelligentRetrieve, shouldCallTool, shouldRetrieveKnowledge } from "./intent_detector.js";
import { createChains, createChatWithHistory, formatSearchResults } from "./chat_system.js";
import { printSection, printInfo, printSuccess, printError, line } from "./utils.js";

async function testIntentDetection() {
  printSection("🧪 测试意图识别");

  const testCases = [
    { query: "你好", expected: { tool: false, retrieve: false } },
    { query: "2+3等于多少", expected: { tool: true, retrieve: false } },
    { query: "20摄氏度等于多少华氏度", expected: { tool: true, retrieve: false } },
    { query: "有哪些用户", expected: { tool: true, retrieve: false } },
    { query: "代码规范是什么", expected: { tool: false, retrieve: true } },
    { query: "如何开发一个系统", expected: { tool: false, retrieve: true } },
  ];

  for (const testCase of testCases) {
    console.log(`\n查询: "${testCase.query}"`);

    const toolResult = shouldCallTool(testCase.query);
    const retrieveResult = shouldRetrieveKnowledge(testCase.query);

    console.log(`  工具调用: ${toolResult} (预期: ${testCase.expected.tool})`);
    console.log(`  知识检索: ${retrieveResult} (预期: ${testCase.expected.retrieve})`);

    if (toolResult === testCase.expected.tool && retrieveResult === testCase.expected.retrieve) {
      printSuccess("  ✅ 测试通过");
    } else {
      printError("  ❌ 测试失败");
    }
  }
}

async function testIntelligentRetrieve() {
  printSection("🧪 测试智能检索");

  const testQueries = [
    "2+3等于多少",
    "公司信息",
    "代码规范",
    "系统状态"
  ];

  for (const query of testQueries) {
    console.log(`\n查询: "${query}"`);

    try {
      const result = await intelligentRetrieve(query, false);

      console.log(`  需要工具: ${result.needsTool}`);
      console.log(`  需要检索: ${result.needsRetrieval}`);

      if (result.needsTool) {
        printInfo("  🔧 判断为工具调用问题");
      } else if (result.needsRetrieval) {
        printInfo("  🔍 判断为知识库检索问题");
      } else {
        printInfo("  💬 判断为通用问题");
      }
    } catch (error) {
      printError(`  ❌ 测试失败: ${error.message}`);
    }
  }
}

async function testChatSystem() {
  printSection("🧪 测试对话系统");

  try {
    const { generalChain, ragChain } = createChains();
    console.log("✅ 对话链创建成功");

    const chatInstances = createChatWithHistory(generalChain, ragChain);
    console.log("✅ 聊天实例创建成功");

    const testResults = [
      { query: "测试文档1", text: "这是第一个测试文档的内容..." },
      { query: "测试文档2", text: "这是第二个测试文档的内容..." }
    ];

    const formatted = formatSearchResults(testResults);
    console.log("✅ 搜索结果格式化成功");
    console.log(`格式化结果长度: ${formatted.length} 字符`);

  } catch (error) {
    printError(`❌ 测试失败: ${error.message}`);
  }
}

async function main() {
  console.log("🚀 开始测试模块化版本功能");
  line();

  try {
    // 1. 测试意图识别
    await testIntentDetection();
    line();

    // 2. 测试智能检索
    await testIntelligentRetrieve();
    line();

    // 3. 测试对话系统
    await testChatSystem();
    line();

    printSuccess("🎉 所有模块测试完成！");

  } catch (error) {
    printError(`❌ 测试过程出错: ${error.message}`);
    console.error(error.stack);
  }
}

main().catch(error => {
  printError(`❌ 测试启动失败: ${error.message}`);
  process.exit(1);
});