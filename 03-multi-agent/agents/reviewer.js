import { createLLM, streamLLM } from "../../llm/index.js";

export async function reviewerAgent(article) {
  const llm = createLLM();

  console.log("\n[审稿人正在审阅文章...]\n");

  let output = "";

  await streamLLM(
    llm,
    `你是一名严格的审稿人，请审阅并指出以下文章的改进意见，并给出最终建议（接受/修改/拒绝）：
${article}`,
    (token) => {
      process.stdout.write(token);
      output += token;
    }
  );

  console.log("\n\n[审稿完成]\n");

  return {
    role: "reviewer",
    content: output.trim(),
  };
}
