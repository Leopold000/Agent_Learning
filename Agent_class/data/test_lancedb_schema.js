import { connect } from "@lancedb/lancedb";

const dbPath = './vector_store_test';

async function test() {
  // Remove existing database if it exists
  try {
    await fetch(`file://${dbPath}`);
    console.log('Removing existing database...');
    require('fs').rmSync(dbPath, { recursive: true });
  } catch (e) {}

  const db = await connect(dbPath);
  console.log('Database connected:', dbPath);

  // Define schema for the vector field
  const schema = {
    fields: [
      { name: "id", type: "int32", nullable: true },
      { name: "text", type: "utf8", nullable: true },
      {
        name: "vector",
        type: {
          "typeId": 3,
          "children": [
            {
              "name": "item",
              "type": {
                "typeId": 2,
                "precision": 1
              },
              "nullable": true
            }
          ],
          "listSize": 1536
        },
        nullable: true
      }
    ]
  };

  // Create table with explicit schema
  const table = await db.createEmptyTable('test_vectors', schema);
  console.log('Table created with schema:', JSON.stringify(table.schema(), null, 2));

  // Add test data
  const testData = [
    {
      id: 1,
      text: 'test document',
      vector: Array(1536).fill(0.1)
    }
  ];

  await table.add(testData);
  console.log('Data added to table');

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