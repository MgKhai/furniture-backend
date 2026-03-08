import { Request, Response, NextFunction } from "express";
import { body, query, validationResult } from "express-validator";
import { errorCodes } from "../config/errorCodes";

interface CustomRequest extends Request {
  userId: number;
}

export const changeLanguage: any = [
  query("lng", "invalid language")
    .trim()
    .notEmpty()
    .matches(/^[a-z]+$/)
    .isLength({ min: 2, max: 3 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400;
      error.errorCode = errorCodes.invalid;
      return next(error);
    }

    const { lng } = req.query;

    if (lng !== "en" && lng !== "mm") {
      const error: any = new Error("Unsupported language");
      error.status = 400;
      error.errorCode = errorCodes.invalid;
      return next(error);
    }

    res.cookie("i18next", lng);
    res
      .status(200)
      .json({ message: req.t("languageChanged", { language: lng }) });
  },
];
