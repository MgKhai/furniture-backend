import { Worker } from "bullmq";
import { redis } from "../../config/redisClient";

const cacheWorker = new Worker(
  "cache-invalidation",
  async (job) => {
    const { pattern } = job.data;
    await invalidateCache(pattern);
  },
  {
    connection: redis,
    concurrency: 5, // proccess 5 job at the same time
  }
);

cacheWorker.on("completed", (job) => {
  console.log(`Job with ID ${job.id} has been completed.`);
});

cacheWorker.on("failed", (job, err) => {
  console.error(`Job with ID ${job!.id} has failed with error: ${err.message}`);
});

const invalidateCache = async (pattern: string) => {
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    });

    const pipeline = redis.pipeline();
    let totalKeys = 0;

    // proccess keys in batches
    stream.on("data", (keys: string[]) => {
      if (keys.length) {
        keys.forEach((key) => pipeline.del(key));
        totalKeys++;
      }
    });

    // Wrap stream events in a Promise to ensure we wait for completion
    await new Promise<void>((resolve, reject) => {
      stream.on("end", async () => {
        try {
          if (totalKeys > 0) {
            await pipeline.exec();
            console.log(
              `Cache invalidation completed. Total keys deleted: ${totalKeys}`
            );
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      stream.on("error", async (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.log("Cache invalidation error: ", error);
    throw error;
  }
};
