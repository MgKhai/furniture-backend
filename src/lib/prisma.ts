// src/lib/prisma.ts (or wherever you initialize prisma)
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    user: {
      fullName: {
        needs: {
          firstName: true,
          lastName: true,
        },
        compute(user) {
          return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
        },
      },
    },

    post: {
      image: {
        needs: { image: true },
        compute(post) {
          if (!post.image) return null;
          return "/optimize/" + post.image.split(".")[0] + ".webp";
        },
      },

      updatedAt: {
        needs: { updatedAt: true },
        compute(post) {
          return post.updatedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        },
      },
    },
  },
});
