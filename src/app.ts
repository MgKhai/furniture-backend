import { i18n } from "./../node_modules/i18next/index.d";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { limiter } from "./middleware/rateLimiter";
import cookieParser from "cookie-parser";
import { Request, Response, NextFunction } from "express";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
// import cron from "node-cron";
import path from "path";
import routes from "./routes/v1";
import {
  createOrUpdateSettingStatus,
  getSettingStatus,
} from "./services/settingService";

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
  },
  credentials: true, // Allow cookies or authentication headers
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

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(process.cwd(), "src/locales/{{lng}}/{{ns}}.json"), // Adjust the path to your translation files
    },
    detection: {
      order: ["querystring", "cookie", "header"], // Order of language detection
      cache: ["cookie"], // Cache the detected language in a cookie
    },
    fallbackLng: "en", // Fallback language if the detected language is not available
    preload: ["en", "mm"], // Preload languages (optional, can be used to load languages at startup)
  });

app.use(middleware.handle(i18next));
app.use(routes);

// app.use("/api/v1", authRoutes);
// app.use("/api/v1/admin", auth, authorise(true, "USER"), userRoutes);
// app.use("/api/v1", profieRoutes);
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Something went wrong";
  const errorCode = error.errorCode || "INTERNAL_SERVER_ERROR";
  res.status(status).json({
    message,
    error: errorCode,
  });
});

// cron.schedule("* * * * *", async () => {
//   console.log("running a task every minute");
//   const setting = await getSettingStatus("maintenance");
//   console.log(setting!.value);
//   if (setting!.value === "true") {
//     await createOrUpdateSettingStatus("maintenance", "false");
//     const newSetting = await getSettingStatus("maintenance");
//     console.log(newSetting!.value);
//     console.log("Maintenance mode turned off");
//   } else {
//     console.log("Maintenance mode is already off");
//   }
// });
