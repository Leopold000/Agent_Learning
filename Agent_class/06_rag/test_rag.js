import { initDB, search } from "./rag_search.js";

async function testRAG() {
  console.log("Testing RAG functionality...");

  try {
    // Initialize the database connection
    await initDB();
    console.log("✅ Database initialized successfully!");

    // Test search with a sample query
    const results = await search("rules", 2);
    console.log(`Found ${results.length} results:`);

    results.forEach((result, i) => {
      console.log(`\nResult ${i + 1}:`);
      console.log(`File: ${result.file}`);
      console.log(`Text: ${result.text.substring(0, 200)}...`);
      console.log(`Score: ${result.score}`);
    });

  } catch (error) {
    console.error("❌ Error testing RAG:", error.message);
    if (error.stack) console.error(error.stack);
  }
}

testRAG();