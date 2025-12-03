export const LLM_PROVIDER = "ollama";
// 可选： "ollama" | "openai" | "deepseek" | "azure" | "qwen"

export const MODEL_NAME = {
  ollama: "llama3.1:8b",
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  azure: "gpt-4o-mini",
  qwen: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
};

export const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  azure: process.env.AZURE_API_KEY,
  qwen: "xxxx",
};
