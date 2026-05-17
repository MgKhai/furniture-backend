import { Queue } from "bullmq";
import { redis } from "../../config/redisClient";

const cacheQueue = new Queue("cache-invalidation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times on failure
    backoff: {
      type: "exponential",
      delay: 1000, // Initial delay of 1 second
    },
    removeOnComplete: true, // Remove job from queue on completion
    removeOnFail: 1000, // Keep failed jobs for debugging
  },
});

export default cacheQueue;
