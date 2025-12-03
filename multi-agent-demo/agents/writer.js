import { runModel } from "../llm.js";
import { printStream } from "../stream.js";

export async function writerAgent(topic, model) {
  const prompt = `
你是文章撰写人，请根据主题写出一篇完整的技术文章初稿：
主题：${topic}
`;

  const stream = await runModel({ model, prompt, streaming: true });
  const result = await printStream(stream);
  return result;
}
