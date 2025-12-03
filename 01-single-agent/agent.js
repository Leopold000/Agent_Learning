import { createLLM } from "../llm/index.js";

export function createSingleAgent() {
  return createLLM();      // ← 本地/云端自动切换
}
