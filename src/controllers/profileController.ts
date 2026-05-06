import { Request, Response, NextFunction } from "express";
import { body, check, query, validationResult } from "express-validator";
import { errorCodes } from "../config/errorCodes";
import { get } from "http";
import { createError } from "../utils/error";
import { getUserById } from "../services/authService";
import { authorise } from "../utils/authorise";
import { checkUserIfNotExist } from "../utils/auth";

interface CustomRequest extends Request {
  userId: number;
  user: any;
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
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const { lng } = req.query;

    if (lng !== "en" && lng !== "mm") {
      return next(createError("Unsupported language", 400, errorCodes.invalid));
    }

    res.cookie("i18next", lng);
    res
      .status(200)
      .json({ message: req.t("languageChanged", { language: lng }) });
  },
];

export const testPermission: any = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const user = await getUserById(userId);
  checkUserIfNotExist(user);

  const info: any = {
    title: "Permission Test",
  };

  const can = authorise(true, user!.role, "USER");

  if (can) {
    info.message = "You are a user.";
  }

  res.status(200).json({ info });
};
