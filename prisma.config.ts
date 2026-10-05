import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "pnpm db:seed",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://qc:qc@localhost:5432/qc",
  },
});
