import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { errorCodes } from "../../config/errorCodes";
import { createError } from "../../utils/error";
import { createOrUpdateSettingStatus } from "../../services/settingService";

interface CustomRequest extends Request {
  userId: number;
  user: any;
}

export const setMaintenance: any = [
  body("mode", "mode must be a boolean.").isBoolean(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const { mode } = req.body;

    const value = mode ? "true" : "false";
    const message = mode
      ? "Maintenance mode enabled."
      : "Maintenance mode disabled.";

    await createOrUpdateSettingStatus("maintenance", value);
    res.status(200).json({ message });
  },
];
