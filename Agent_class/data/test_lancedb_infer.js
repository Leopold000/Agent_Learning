import { connect } from "@lancedb/lancedb";

const dbPath = './vector_store_test';
const tableName = 'test_vectors';

async function test() {
  // Remove existing database if it exists
  try {
    await fetch(`file://${dbPath}`);
    console.log('Removing existing database...');
    require('fs').rmSync(dbPath, { recursive: true });
  } catch (e) {}

  const db = await connect(dbPath);
  console.log('Database connected:', dbPath);

  // Check if table already exists and drop it
  try {
    await db.openTable(tableName);
    console.log(`Table ${tableName} exists, dropping...`);
    await db.dropTable(tableName);
  } catch (error) {
    // Table doesn't exist, which is fine
    console.log(`Table ${tableName} does not exist, creating new one`);
  }

  // Create table with data, letting LanceDB infer the schema
  const testData = [
    {
      id: 1,
      text: 'test document',
      vector: Array(1536).fill(0.1)
    }
  ];

  // Use createTable instead of createEmptyTable
  const table = await db.createTable(tableName, testData);
  console.log('Table created with inferred schema:', JSON.stringify(table.schema(), null, 2));

  // Add more test data
  const moreData = [
    {
      id: 2,
      text: 'second document',
      vector: Array(1536).fill(0.2)
    },
    {
      id: 3,
      text: 'third document',
      vector: Array(1536).fill(0.3)
    }
  ];

  await table.add(moreData);
  console.log('Additional data added to table');

  // Query the data
  const results = await table.query().toArray();
  console.log('\nQuery results:');
  console.log('Number of records:', results.length);

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    console.log(`\nRow ${i + 1}:`);
    Object.keys(row).forEach(key => {
      console.log(`${key} type:`, typeof row[key]);
      if (key === 'vector') {
        console.log('Vector length:', Array.isArray(row[key]) ? row[key].length : 'not an array');
        console.log('First values:', Array.isArray(row[key]) ? row[key].slice(0, 5) : 'not an array');
      }
    });
  }
}

test();