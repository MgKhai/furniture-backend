import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { limiter } from "./middleware/rateLimiter";
import cookieParser from "cookie-parser";
import { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/v1/auth/auth";
import userRoutes from "./routes/v1/admin/user";
import { auth } from "./middleware/auth";

export const app = express();

var whitelist = ["http://example1.com", "http://localhost:5173"];
var corsOptions = {
  origin: function (
    origin: any,
    callback: (error: Error | null, origin?: any) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
    credentials: true; // Allow cookies or authentication headers
  },
};

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(cors(corsOptions))
  .use(helmet())
  .use(compression())
  .use(limiter);

app.use("/api/v1", authRoutes);
app.use("/api/v1/admin", auth, userRoutes);
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Something went wrong";
  const errorCode = error.errorCode || "INTERNAL_SERVER_ERROR";
  res.status(status).json({
    message,
    error: errorCode,
  });
});
