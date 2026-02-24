import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import {
  createOtp,
  createUser,
  getOtpByPhone,
  getUserByPhone,
  updateOtp,
  updateUser,
} from "../services/authService";
import {
  checkOtpErrorIfSameDate,
  checkOtpRow,
  checkUserExist,
} from "../utils/auth";
import { generateOTP, generateToken } from "../utils/generate";
import moment from "moment";
import jwt from "jsonwebtoken";

// register
export const register = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{11}$/)
    .withMessage("Phone number must be 11 digits"),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400;
      error.errorCode = "Error_invalid";
      return next(error);
    }

    let phone = req.body.phone;
    if (phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserExist(user);

    // const otp = generateOTP();
    const otp = 123456;
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);
    const rememberToken = generateToken();

    const otpRow = await getOtpByPhone(phone);
    let result;
    if (!otpRow) {
      const otpData = {
        phone,
        code: hashOtp,
        rememberToken,
        count: 1,
      };

      result = await createOtp(otpData);
    } else {
      const lateOtpRequest = new Date(otpRow.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lateOtpRequest === today;
      checkOtpErrorIfSameDate(isSameDate, otpRow.errorCount);

      if (!isSameDate) {
        const otpData = {
          code: hashOtp,
          rememberToken,
          count: 1,
          errorCount: 0,
        };

        result = await updateOtp(otpRow.id, otpData);
      } else {
        if (otpRow.count === 3) {
          const error: any = new Error(
            "OTP is allowed to request 3 times per day."
          );
          error.status = 405;
          error.errorCode = "Error_OverLimit";
          throw error;
        } else {
          const otpData = {
            code: hashOtp,
            rememberToken,
            count: {
              increment: 1,
            },
          };

          result = await updateOtp(otpRow.id, otpData);
        }
      }
    }

    res.status(200).json({
      message: `We are sending OTP to 09${result.phone}`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

// verify otp
export const verifyOtp = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{9}$/),
  body("otp", "Invalid OTP")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{6}$/),
  body("token", "Invalid token").trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400;
      error.errorCode = "Error_invalid";
      return next(error);
    }

    const { phone, otp, token } = req.body;

    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    const lateOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lateOtpVerify === today;
    checkOtpErrorIfSameDate(isSameDate, otpRow!.errorCount);
    let result;

    if (otpRow?.rememberToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);

      const error: any = new Error("Invalid token");
      error.status = 400;
      error.errorCode = "Error_Invalid";
      throw error;
    }

    const isMatchOtp = await bcrypt.compare(otp, otpRow!.code);
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 2;

    if (isMatchOtp) {
      if (isExpired) {
        const error: any = new Error("OTP is expired.");
        error.status = 403;
        error.errorCode = "Error_Expired";
        throw error;
      }
      const verifyToken = await generateToken();
      const otpData = {
        verifyToken,
        errorCount: 0,
        count: 1,
      };

      result = await updateOtp(otpRow!.id, otpData);
    }

    if (!isMatchOtp) {
      if (!isSameDate) {
        const otpData = {
          errorCount: 1,
        };

        await updateOtp(otpRow!.id, otpData);
      } else {
        const otpData = {
          errorCount: {
            increament: 1,
          },
        };

        await updateOtp(otpRow!.id, otpData);
      }

      const error: any = new Error("OTP is incorrect.");
      error.status = 401;
      error.errorCode = "Error_Invalid";
      throw error;
    }

    res.status(200).json({
      measssage: "OTP is successfully verified.",
      phone: result!.phone,
      token: result!.verifyToken,
    });
  },
];

// confirm password
export const confirmPassword = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{9}$/),
  body("password", "Invalid password")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{8}$/)
    .withMessage("Password must be 8 digits."),
  body("token", "Invalid token").trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400;
      error.errorCode = "Error_invalid";
      return next(error);
    }

    const { phone, password, token } = req.body;

    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    if (otpRow?.errorCount === 5) {
      const error: any = new Error(
        "This request may be an attack.If not, try again tomorrow."
      );
      error.status = 400;
      error.errorCode = "Error_BadRequest";
      throw error;
    }

    if (otpRow?.verifyToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);

      const error: any = new Error("Invalid token");
      error.status = 400;
      error.errorCode = "Error_Invalid";
      throw error;
    }

    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 10;

    if (isExpired) {
      const error: any = new Error(
        "Your request is expired. Please try again."
      );
      error.status = 403;
      error.errorCode = "Error_Expired";
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const userData = {
      phone,
      password: hashPassword,
      randToken: "I will replace soon.",
    };

    const newUser = await createUser(userData);

    const accessTokenPayLoad = { id: newUser.id };
    const accessToken = jwt.sign(
      accessTokenPayLoad,
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: 15 * 60 }
    );

    const refreshTokenPayLoad = { id: newUser.id, phone: newUser.phone };
    const refreshToken = jwt.sign(
      refreshTokenPayLoad,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      }
    );

    const userUpdateData = {
      randToken: refreshToken,
    };

    await updateUser(newUser.id, userUpdateData);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 60 * 60 * 1000, // 30 days
      })
      .status(201)
      .json({
        message: "successfully created an account.",
        userid: newUser.id,
        accessToken,
        refreshToken,
      });
  },
];
