import { runModel } from "../llm.js";
import { printStream } from "../stream.js";

export async function publisherAgent(content, model) {
  const prompt = `
你是发布者，请将文章转成可正式发布的版本（带标题、小节、结尾）：
${content}
`;

  const stream = await runModel({ model, prompt, streaming: true });
  const result = await printStream(stream);
  return result;
}
