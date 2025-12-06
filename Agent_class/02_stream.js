// 02_stream.js
// 流式输出示例
import { ChatOllama } from "@langchain/ollama";

const model = new ChatOllama({
  model: "llama3.1:8b",
  baseUrl: "http://localhost:11434",
});

// 🚀 开始流式输出
const stream = await model.stream("给我讲一个有趣的猫咪小知识");

for await (const chunk of stream) {
  process.stdout.write(chunk.content); // 实时输出
}

console.log("\n\n--- 完成 ---");
