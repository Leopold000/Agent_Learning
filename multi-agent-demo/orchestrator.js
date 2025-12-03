import { writerAgent } from "./agents/writer.js";
import { reviewerAgent } from "./agents/reviewer.js";
import { authorAgent } from "./agents/author.js";
import { editorAgent } from "./agents/editor.js";
import { publisherAgent } from "./agents/publisher.js";

const MODEL = "ollama:llama3.1:8b";
// or
// const MODEL = "gpt-4o-mini";
// const MODEL = "deepseek-chat";
// const MODEL = "moonshot-v1-8k";

async function run() {
  console.log("=== Step 1: Writer ===");
  const draft = await writerAgent("智能体应用开发范式", MODEL);

  console.log("=== Step 2: Reviewer ===");
  const review = await reviewerAgent(draft, MODEL);

  console.log("=== Step 3: Author ===");
  const revised = await authorAgent(draft, review, MODEL);

  console.log("=== Step 4: Editor ===");
  const polished = await editorAgent(revised, MODEL);

  console.log("=== Step 5: Publisher ===");
  const finalDoc = await publisherAgent(polished, MODEL);

  console.log("\n\n=== Final Output ===\n");
  console.log(finalDoc);
}

run();
