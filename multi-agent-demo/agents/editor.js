import { runModel } from "../llm.js";
import { printStream } from "../stream.js";

export async function editorAgent(content, model) {
  const prompt = `
你是编辑，请对文章进行润色、增强可读性、统一格式：
${content}
`;

  const stream = await runModel({ model, prompt, streaming: true });
  const result = await printStream(stream);
  return result;
}
