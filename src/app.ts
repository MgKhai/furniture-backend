import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { limiter } from "./middleware/rateLimiter";
import { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/v1/auth/auth";

interface CustomRequest extends Request {
  userId?: number;
}

export const app = express();

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cors())
  .use(helmet())
  .use(compression());
// .use(limiter);

app.use("/api/v1", authRoutes);
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Something went wrong";
  const errorCode = error.errorCode || "INTERNAL_SERVER_ERROR";
  res.status(status).json({
    message,
    error: errorCode,
  });
});
