import { Queue } from "bullmq";
import { redis } from "../../config/redisClient";

const imageQueue = new Queue("imageQueue", { connection: redis });

export default imageQueue;
