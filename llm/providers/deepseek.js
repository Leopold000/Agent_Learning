import { ChatOpenAI } from "@langchain/openai";
import { API_KEYS, MODEL_NAME } from "../../config.js";

export function createDeepSeekModel() {
  return new ChatOpenAI({
    apiKey: API_KEYS.deepseek,
    model: MODEL_NAME.deepseek,
    temperature: 0.3,
    baseURL: "https://api.deepseek.com/v1"
  });
}
