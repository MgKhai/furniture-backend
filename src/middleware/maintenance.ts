import { Request, Response, NextFunction } from "express";
import { getSettingStatus } from "../services/settingService";
import { createError } from "../utils/error";
import { errorCodes } from "../config/errorCodes";

const whiteLists = ["127.0.0.1"];

export const maintenance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (whiteLists.includes(ip as string)) {
    next();
  } else {
    const setting = await getSettingStatus("maintenance");

    if (setting?.value === "true") {
      return next(
        createError(
          "The system is currently under maintenance. Please try again later.",
          503,
          errorCodes.maintenance
        )
      );
    }
  }

  next();
};
