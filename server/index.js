import "dotenv/config";
import { initializeDatabase, pool } from "./db.js";
import app from "./app.js";

const port = Number(process.env.PORT || 4000);

try {
  await initializeDatabase();
  const server = app.listen(port, () => console.log(`BookLeaf API listening on http://localhost:${port}`));

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(() => {
        void pool.end();
        process.exit(0);
      });
    });
  }
} catch (error) {
  console.error("Unable to start BookLeaf API:", error.message);
  await pool.end();
  process.exitCode = 1;
}
