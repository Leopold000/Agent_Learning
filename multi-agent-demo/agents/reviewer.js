import { runModel } from "../llm.js";
import { printStream } from "../stream.js";

export async function reviewerAgent(draft, model) {
  const prompt = `
你是审稿人，请审阅以下文章，并输出详细的“修改意见清单”：

文章初稿：
${draft}
`;

  const stream = await runModel({ model, prompt, streaming: true });
  const result = await printStream(stream);
  return result;
}
