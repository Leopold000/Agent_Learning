import { createLLM, streamLLM } from "../../llm/index.js";

export async function writerAgent(researchMaterial) {
  const llm = createLLM();

  console.log("\n[作者开始撰写文章...]\n");

  let output = "";

  await streamLLM(
    llm,
    `你是一名文章作者。请基于以下研究资料撰写一篇结构清晰的文章：
${researchMaterial}`,
    (token) => {
      process.stdout.write(token);
      output += token;
    }
  );

  console.log("\n\n[作者完成]\n");

  return {
    role: "writer",
    content: output.trim(),
  };
}
