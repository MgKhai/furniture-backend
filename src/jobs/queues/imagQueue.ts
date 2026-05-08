import { Queue } from "bullmq";
import redis from "ioredis";

const connection = new redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || "6379"),
  // password: process.env.REDIS_PASSWORD,
});

const imageQueue = new Queue("imageQueue", { connection });

export default imageQueue;
