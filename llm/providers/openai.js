import { ChatOpenAI } from "@langchain/openai";
import { API_KEYS, MODEL_NAME } from "../../config.js";

export function createOpenAIModel() {
  return new ChatOpenAI({
    apiKey: API_KEYS.openai,
    model: MODEL_NAME.openai,
    temperature: 0.3
  });
}
