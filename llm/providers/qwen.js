import { ChatOpenAI } from "@langchain/openai";
import { API_KEYS, MODEL_NAME } from "../../config.js";

export function createQwenModel() {
  return new ChatOpenAI({
    apiKey: API_KEYS.qwen,
    model: MODEL_NAME.qwen,
    temperature: 0.3,
    baseURL: "https://api-inference.modelscope.cn/v1",
  });
}
