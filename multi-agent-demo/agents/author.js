import { runModel } from "../llm.js";
import { printStream } from "../stream.js";

export async function authorAgent(draft, reviewComments, model) {
  const prompt = `
你是文章作者，请根据审稿人的修改意见对初稿进行完全重写：

初稿：
${draft}

审稿意见：
${reviewComments}

请输出修改后的新版文章。
`;

  const stream = await runModel({ model, prompt, streaming: true });
  const result = await printStream(stream);
  return result;
}
