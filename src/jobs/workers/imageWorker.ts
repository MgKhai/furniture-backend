import { Worker } from "bullmq";
import sharp from "sharp";
import path from "path";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || "6379"),
  // password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

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
  { connection }
);

imageWorker.on("completed", (job) => {
  console.log(`Job with ID ${job.id} has been completed.`);
});

imageWorker.on("failed", (job, err) => {
  console.error(`Job with ID ${job!.id} has failed with error: ${err.message}`);
});
