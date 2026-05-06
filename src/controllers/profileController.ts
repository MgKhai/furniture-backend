import { upload } from "./../middleware/uploadFile";
import { Request, Response, NextFunction } from "express";
import { body, check, query, validationResult } from "express-validator";
import { errorCodes } from "../config/errorCodes";
import { get } from "http";
import { createError } from "../utils/error";
import { getUserById, updateUser } from "../services/authService";
import { authorise } from "../utils/authorise";
import { checkUserIfNotExist } from "../utils/auth";
import { error } from "console";
import { unlink } from "node:fs/promises";
import path from "path";

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

export const uploadFile: any = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const image = req.file;

  const user = await getUserById(userId);
  await checkUserIfNotExist(user);
  if (!image) {
    const error: any = new Error("File upload failed");
    error.status = 409;
    error.errorCode = errorCodes.invalid;
    throw error;
  }

  if (user!.image) {
    try {
      const oldImagePath = path.join(
        __dirname,
        "../uploads/images",
        user!.image
      );
      await unlink(oldImagePath!);
    } catch (error) {
      console.error("Error deleting old profile image");
    }
  }

  const profileImage = image.filename;

  const userData = {
    image: profileImage,
  };

  await updateUser(userId, userData);

  res
    .status(200)
    .json({ message: "File uploaded successfully", image: profileImage });
};
