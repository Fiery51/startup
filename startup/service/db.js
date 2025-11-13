const fs = require('fs');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

let client;
let database;

function loadConfig() {
  const configPath = path.join(__dirname, 'dbConfig.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing Mongo config at ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const { hostname, userName, password, dbName } = parsed;
  if (!hostname || !userName || !password) {
    throw new Error('dbConfig.json must include hostname, userName, and password');
  }
  return {
    hostname,
    userName,
    password,
    dbName: dbName || 'startup',
  };
}

async function connectToDatabase() {
  if (database) return database;
  const { hostname, userName, password, dbName } = loadConfig();
  const uri = `mongodb+srv://${encodeURIComponent(userName)}:${encodeURIComponent(password)}@${hostname}/?retryWrites=true&w=majority&appName=startup`;
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  await client.connect();
  database = client.db(dbName);
  return database;
}

function getDb() {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return database;
}

async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    database = null;
  }
}

module.exports = {
  connectToDatabase,
  getDb,
  closeDatabase,
};
