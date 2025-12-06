import { connect } from "@lancedb/lancedb";
import { OllamaEmbeddings } from "@langchain/ollama";
import path from "path";

// Get the directory name correctly for Windows
const __filename = new URL(import.meta.url).pathname.replace(/^\//, '/');
let __dirname = path.dirname(__filename);

// Remove any extra leading slashes from Windows paths
if (__dirname.startsWith('/')) {
  // Handle Windows paths like /E:/path/to/file
  const match = __dirname.match(/^\/(\w:)/);
  if (match) {
    __dirname = __dirname.substring(1);
  }
}

// Use path.resolve to handle paths correctly on Windows
const dbPath = path.resolve(__dirname, "../data/vector_store_lancedb");

let db;
let table;

// 初始化数据库
export async function initDB() {
  db = await connect(dbPath);
  table = await db.openTable("knowledge_vectors");
  if (!table) {
    throw new Error("❌ LanceDB 知识库不存在，请先运行 embed.js");
  }
}

// RAG 查询 topK 文本块
export async function search(query, topK = 3) {
  if (!table) throw new Error("数据库未初始化");

  try {
    // 首先获取查询的嵌入向量
    const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });
    const queryVec = await embeddings.embedQuery(query);

    // 使用向量搜索而不是文本搜索
    // 指定向量列名称为"vector"
    const results = await table.search(queryVec, { vectorColumnName: "vector" })
      .limit(topK)
      .toArray();

    // 转换结果格式以匹配原有返回结构
    return results.map(item => ({
      file: item.source,
      text: item.text,
      score: item._distance !== undefined ? 1 / (1 + item._distance) : 0  // 将距离转换为相似度
    }));
  } catch (error) {
    console.error("❌ 搜索失败:", error);
    throw error;
  }
}
