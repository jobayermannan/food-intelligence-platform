import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DatabaseService } from "./database.service";
import { resolve } from "node:path";
import { roles } from "./schema";

async function main() {
  const database = new DatabaseService();
  try {
    await migrate(database.db, {
      migrationsFolder: resolve(__dirname, "../../drizzle"),
    });
    for (const code of ["OWNER", "ADMIN", "STAFF", "VIEWER"])
      await database.db.insert(roles).values({ code }).onConflictDoNothing();
  } finally {
    await database.onModuleDestroy();
  }
}
main().catch((error: unknown) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
