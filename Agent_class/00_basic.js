// basic.js
// 最基础的对话模型
import { ChatOllama } from "@langchain/ollama";

const llm = new ChatOllama({
  model: "llama3.1:8b",
  baseUrl: "http://localhost:11434",
});

const res = await llm.invoke("你好！你是谁？");
console.log(res);
