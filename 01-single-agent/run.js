import { createSingleAgent } from "./agent.js";

import { streamLLM } from "../llm/index.js";

const llm = createSingleAgent();
console.log("\n===== 流式输出开始 =====\n");

await streamLLM(llm, "用最简单的方式解释什么是量子计算", (token) => {
  process.stdout.write(token);
});

console.log("\n\n===== 流式输出结束 =====\n");
