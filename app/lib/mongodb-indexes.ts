import clientPromise from './mongodb'

async function createIndexes() {
  const client = await clientPromise
  const db = client.db("llm_evaluation_system")

  // Create unique index on username
  await db.collection('users').createIndex(
    { username: 1 }, 
    { unique: true }
  )
}

// You can run this function during app initialization
createIndexes().catch(console.error)
