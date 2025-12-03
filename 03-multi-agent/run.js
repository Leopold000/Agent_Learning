import { researcherAgent } from "./agents/researcher.js";
import { writerAgent } from "./agents/writer.js";
import { reviewerAgent } from "./agents/reviewer.js";

async function main() {
  const topic = "人工智能智能体应用的未来趋势";

  // 1. 研究员 → 输出研究结果
  const research = await researcherAgent(topic);

  // 2. 作者 → 使用研究结果写文章
  const article = await writerAgent(research.content);

  // 3. 审稿人 → 审核文章
  const review = await reviewerAgent(article.content);

  console.log("\n=== 最终结果结构化输出 ===\n");
  console.log(JSON.stringify({ research, article, review }, null, 2));
}

main();
