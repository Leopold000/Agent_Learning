import { createLLM, streamLLM } from "../llm/index.js";

const llm = createLLM();

export async function runWorkflow(q) {
  console.log("=== Step1: 拆分 ===");
  await streamLLM(llm, `请拆分下面的问题：${q}`, (t) =>
    process.stdout.write(t)
  );

  console.log("\n\n=== Step2: 分析 ===");
  await streamLLM(llm, `请分析该问题的关键因素：${q}`, (t) =>
    process.stdout.write(t)
  );

  console.log("\n\n=== Step3: 综合总结 ===");
  await streamLLM(llm, `请整合结论并总结：${q}`, (t) =>
    process.stdout.write(t)
  );

  console.log("\n");
}
