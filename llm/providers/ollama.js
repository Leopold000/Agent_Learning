import { ChatOllama } from "@langchain/ollama";
import { MODEL_NAME } from "../../config.js";

export function createOllamaModel() {
  return new ChatOllama({
    model: MODEL_NAME.ollama,
    temperature: 0.3
  });
}
