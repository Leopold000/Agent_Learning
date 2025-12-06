import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { OllamaEmbeddings } from "@langchain/ollama";
import { connect } from "@lancedb/lancedb";

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

const knowledgeDir = path.resolve(__dirname, "../data/knowledge");
const dbPath = path.resolve(__dirname, "../data/vector_store_lancedb");
const SUPPORTED = ["docx", "doc", "md", "txt", "js", "ts"];

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const buffer = fs.readFileSync(filePath);

  switch (ext) {
    case "docx":
    case "doc":
      return (await mammoth.extractRawText({ buffer })).value;
    case "md":
    case "txt":
    case "js":
    case "ts":
      return buffer.toString("utf-8");
    default:
      return "";
  }
}

function splitText(text, chunkSize = 500, chunkOverlap = 50) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - chunkOverlap;
  }
  return chunks;
}

async function main() {
  console.log("📚 重新构建知识库 LanceDB...");

  // 删除现有的数据库
  try {
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
      console.log("🗑️ 已删除旧数据库");
    }
  } catch (error) {
    console.error("删除数据库时出错:", error.message);
  }

  const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });

  // 创建新数据库
  const db = await connect(dbPath);
  console.log("✅ 数据库连接成功");

  const files = fs.readdirSync(knowledgeDir);
  const supportedFiles = files.filter(f => {
    const ext = f.split(".").pop().toLowerCase();
    return SUPPORTED.includes(ext);
  });

  if (supportedFiles.length === 0) {
    throw new Error('知识库目录中没有支持的文件');
  }

  console.log(`📄 找到 ${supportedFiles.length} 个支持的文件`);

  // 收集所有数据
  const allData = [];

  for (const file of supportedFiles) {
    const filePath = path.join(knowledgeDir, file);
    console.log(`➡ 处理文件: ${file}`);

    try {
      const text = await extractText(filePath);
      const chunks = splitText(text, 500, 50);

      for (const chunk of chunks) {
        try {
          const vector = await embeddings.embedQuery(chunk);
          const vectorArray = Array.isArray(vector) ? vector : [vector];

          allData.push({
            source: file,
            text: chunk,
            vector: vectorArray
          });

          console.log(`  ✅ 已处理文本块 (长度: ${chunk.length} 字符)`);
        } catch (embeddingError) {
          console.error(`  ❌ 嵌入失败:`, embeddingError.message);
        }
      }
    } catch (fileError) {
      console.error(`❌ 文件处理失败 ${file}:`, fileError.message);
    }
  }

  if (allData.length === 0) {
    throw new Error('没有成功嵌入任何数据');
  }

  console.log(`\n📊 总共 ${allData.length} 条数据，正在创建表...`);

  // 创建表
  const table = await db.createTable("knowledge_vectors", allData);
  console.log("✅ 表格创建成功!");

  // 验证数据
  console.log("\n🔍 验证数据...");
  const count = await table.countRows();
  console.log(`📈 表中行数: ${count}`);

  // 检查schema
  try {
    const schema = table.schema;
    console.log("📋 Schema:", JSON.stringify(schema, null, 2));
  } catch (e) {
    console.log("⚠️ 无法获取schema:", e.message);
  }

  console.log("\n🎉 知识库构建完成!");
}

main().catch(error => {
  console.error("❌ 构建失败:", error.message);
  process.exit(1);
});