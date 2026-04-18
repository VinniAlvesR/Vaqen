import Database from "better-sqlite3"

const db = new Database("database.db")

// criar tabela
db.prepare(`
    CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    company TEXT
    )
    `).run()

    export default db