import { OpenAI } from "openai";
import { Ollama } from "ollama";

export async function runModel({ model, prompt, streaming = true }) {
  const isOllama = model.startsWith("ollama:");
  const actualModel = isOllama ? model.replace("ollama:", "") : model;

  if (isOllama) {
    // 本地 OLLAMA 流式输出
    const client = new Ollama();
    const stream = await client.chat({
      model: actualModel,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    return stream; // 返回 ReadableStream
  }

  // 云端模型
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.chat.completions.create({
    model: actualModel,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  return response; // 返回 ReadableStream
}
