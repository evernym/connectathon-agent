const SQL = require('sql-template-strings')
const sqlite = require('sqlite')
const globals = require('./globals')
let dbPath
let db

module.exports = {
  addPendingConnReq,
  getPendingConnReq
}

const schema = {
  pending_conn_reqs: `
    CREATE TABLE pending_conn_reqs (
      msgID text PRIMARY KEY NOT NULL,
      myDID text NOT NULL,
      metadata text NOT NULL
    )`
}

async function getDB () {
  let tables = []

  function tableExists (tableName) {
    for (let table of tables) {
      if (table.name === tableName) {
        return true
      }
    }
    return false
  }

  if (!dbPath) {
    dbPath = `./${globals.walletName}_db.sqlite`
  }

  if (!db) {
    db = await sqlite.open(dbPath, { Promise })
    tables = await db.all(SQL`SELECT name FROM sqlite_master WHERE type='table'`)
    for (let tableName of Object.keys(schema)) {
      if (!tableExists(tableName)) {
        await db.all(schema[tableName])
        console.log(`Created table ${tableName}`)
      }
    }
  }
  return db
}

async function query (sql) {
  try {
    await getDB()
    return db.all(sql)
  } catch (e) {
    console.error(e.stack)
    console.log(e.stack)
  }
}

async function addPendingConnReq (msgID, myDID, metadata) {
  await query(SQL`INSERT INTO pending_conn_reqs (msgID, myDID, metadata) VALUES (${msgID}, ${myDID}, ${JSON.stringify(metadata)})`)
}

async function getPendingConnReq (msgId) {
  console.log(`Searching for pending request with id ${msgId}`)
  const response = await query(SQL`SELECT * FROM pending_conn_reqs WHERE msgID=${msgId}`)
  if (response.length === 1) {
    response[0].metadata = JSON.parse(response[0].metadata)
    return response[0]
  } else {
    return null
  }
}
