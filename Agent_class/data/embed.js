import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { OllamaEmbeddings } from "@langchain/ollama";
import { connect } from "@lancedb/lancedb";

const knowledgeDir = path.resolve("./knowledge");
const dbPath = path.resolve("./vector_store_lancedb");
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
  console.log("📚 构建知识库 LanceDB...");

  const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });

  // === LanceDB 新 API ===
  const db = await connect(dbPath);

  // 检查表是否存在，如果不存在则创建
  let table;
  try {
    table = await db.openTable("knowledge_vectors");
  } catch (error) {
    // 表不存在，创建新表
    console.log('Creating new table with proper schema');

    // First get all files
    const files = fs.readdirSync(knowledgeDir);
    if (files.length === 0) {
      throw new Error('No files found in knowledge directory');
    }

    // Find the first supported file
    const firstFile = files.find(f => SUPPORTED.includes(f.split('.').pop().toLowerCase()));
    if (!firstFile) {
      throw new Error('No supported files found in knowledge directory');
    }

    // Process the first file to get its content and create embedding
    const filePath = path.join(knowledgeDir, firstFile);
    console.log(`➡ 使用文件: ${firstFile} 创建表结构`);
    const text = await extractText(filePath);

    // Split into chunks and get first chunk
    const chunks = splitText(text, 500, 50);
    const firstChunk = chunks[0];

    // Get embedding for first chunk
    const vector = await embeddings.embedQuery(firstChunk);

    // Create the first record with proper vector array
    const firstRecord = {
      source: firstFile,
      text: firstChunk,
      vector: Array.isArray(vector) ? vector : [vector]
    };

    // Create table with the first record - this will properly infer the schema
    table = await db.createTable("knowledge_vectors", [firstRecord]);
    console.log('✅ 表格已创建，开始添加剩余数据...');
  }

  const files = fs.readdirSync(knowledgeDir);

  try {
    for (const file of files) {
      const ext = file.split(".").pop().toLowerCase();
      if (!SUPPORTED.includes(ext)) continue;

      const filePath = path.join(knowledgeDir, file);
      console.log(`➡ 读取文件: ${file}`);
      const text = await extractText(filePath);

      const chunks = splitText(text, 500, 50);

      for (const chunk of chunks) {
        try {
          const vector = await embeddings.embedQuery(chunk);
          console.log('Vector type:', typeof vector, 'Is Array:', Array.isArray(vector));

          // Log the first few values if it's an array
          if (Array.isArray(vector)) {
            console.log('First 5 vector values:', vector.slice(0, 5));
          }

          // Ensure vector is an array
          const vectorArray = Array.isArray(vector) ? vector : [vector];

          // Create the data object with proper structure
          const dataToAdd = [{
            source: file,
            text: chunk,
            vector: vectorArray
          }];

          await table.add(dataToAdd);
          console.log(`✅ 已嵌入文本块 (文件: ${file})`);
        } catch (embeddingError) {
          console.error(`❌ 嵌入失败 (文件: ${file}):`, embeddingError.message);
          continue;
        }
      }
    }
  } catch (error) {
    console.error("❌ 数据库操作错误:", error.message);
    process.exit(1);
  }
}

main();
