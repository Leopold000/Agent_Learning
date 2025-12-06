import { connect } from "@lancedb/lancedb";
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

async function testConnection() {
  console.log("Testing database connection...");
  console.log("Database path:", dbPath);

  try {
    const db = await connect(dbPath);
    const table = await db.openTable("knowledge_vectors");

    if (table) {
      console.log("✅ Successfully connected to knowledge base!");
      const rows = await table.rows();
      console.log(`Found ${rows.length} vectors in the knowledge base`);
    }
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  }
}

testConnection();