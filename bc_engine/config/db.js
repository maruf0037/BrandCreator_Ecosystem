const sql = require("mssql");
require("dotenv").config();

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: process.env.SQL_ENCRYPT === "true",
    trustServerCertificate: process.env.SQL_TRUST_CERT === "true"
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log("SQL Server Connected Successfully");
    return pool;
  })
  .catch(err => {
    console.error("SQL Connection Error:", err.message);
    process.exit(1);
  });

module.exports = { sql, poolPromise };
