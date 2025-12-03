import { LLM_PROVIDER } from "../config.js";
import { createOllamaModel } from "./providers/ollama.js";
import { createOpenAIModel } from "./providers/openai.js";
import { createDeepSeekModel } from "./providers/deepseek.js";
import { createAzureModel } from "./providers/azure.js";
import { createQwenModel } from "./providers/qwen.js";

export function createLLM() {
  switch (LLM_PROVIDER) {
    case "ollama":
      return createOllamaModel();
    case "openai":
      return createOpenAIModel();
    case "deepseek":
      return createDeepSeekModel();
    case "azure":
      return createAzureModel();
    case "qwen":
      return createQwenModel();
    default:
      throw new Error("Unknown LLM Provider: " + LLM_PROVIDER);
  }
}

// 统一流式输出函数
export async function streamLLM(llm, prompt, onToken) {
  const stream = await llm.stream(prompt);

  for await (const chunk of stream) {
    const token = chunk.content;
    if (token && onToken) onToken(token);
  }
}
