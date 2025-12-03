import { createLLM, streamLLM } from "../../llm/index.js";

export async function researcherAgent(topic) {
  const llm = createLLM();

  console.log("\n[研究员开始工作...]\n");

  let output = "";

  await streamLLM(
    llm,
    `你是一名专业研究员，请提供对这个主题的详细研究报告：${topic}`,
    (token) => {
      process.stdout.write(token);
      output += token;
    }
  );

  console.log("\n\n[研究员完成]\n");

  return {
    role: "researcher",
    content: output.trim(),
  };
}
