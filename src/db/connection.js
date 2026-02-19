require('dotenv').config();

const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
});

pool.on('connect', () => {
    console.log("Connected to PostgreSQL");
});

pool.on('error', (err) => {
    console.error("Unexpected error on client", err);
    process.exit(1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    client: () => pool.connect(),
};
