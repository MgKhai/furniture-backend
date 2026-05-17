import { Worker } from "bullmq";
import sharp from "sharp";
import path from "path";
import { redis } from "../../config/redisClient";

const imageWorker = new Worker(
  "imageQueue",
  async (job) => {
    const { filePath, fileName, width, height, quality } = job.data;

    const optimizedFilePath = path.join(
      __dirname,
      "../../uploads/optimize/",
      fileName
    );

    await sharp(filePath)
      .resize(width, height)
      .webp({ quality: quality })
      .toFile(optimizedFilePath);
  },
  { connection: redis }
);

imageWorker.on("completed", (job) => {
  console.log(`Job with ID ${job.id} has been completed.`);
});

imageWorker.on("failed", (job, err) => {
  console.error(`Job with ID ${job!.id} has failed with error: ${err.message}`);
});
