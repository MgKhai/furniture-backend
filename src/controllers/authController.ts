import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { errorCodes } from "../config/errorCodes";
import { createError } from "../utils/error";
import {
  createOtp,
  createUser,
  getOtpByPhone,
  getUserById,
  getUserByPhone,
  updateOtp,
  updateUser,
} from "../services/authService";
import {
  checkOtpErrorIfSameDate,
  checkOtpRow,
  checkUserExist,
  checkUserIfNotExist,
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
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
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
          error.errorCode = errorCodes.overLimit;
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
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
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

      return next(createError("Invalid token", 400, errorCodes.invalid));
    }

    const isMatchOtp = await bcrypt.compare(otp, otpRow!.code);
    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 2;

    if (isMatchOtp) {
      if (isExpired) {
        return next(createError("OTP is expired", 403, errorCodes.otpExpired));
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
      return next(createError("OTP is incorrect", 401, errorCodes.invalid));
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
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const { phone, password, token } = req.body;

    const user = await getUserByPhone(phone);
    checkUserExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    if (otpRow?.errorCount === 5) {
      return next(
        createError(
          "This request may be an attack.If not, try again tomorrow.",
          400,
          errorCodes.badRequest
        )
      );
    }

    if (otpRow?.verifyToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);

      return next(createError("Invalid token", 400, errorCodes.invalid));
    }

    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 10;

    if (isExpired) {
      return next(
        createError(
          "Your request is expired. Please try again",
          403,
          errorCodes.requestExpired
        )
      );
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
      });
  },
];

// login
export const login = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{11}$/),
  body("password", "Invalid password")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{8}$/)
    .withMessage("Password must be 8 digits."),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    let phone = req.body.phone;
    const password = req.body.password;

    if (phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }
    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    if (user?.status === "FREEZE") {
      return next(
        createError(
          "Your account is freezed. Please contact to support center",
          403,
          errorCodes.accountFreeze
        )
      );
    }

    const isMatchPassword = await bcrypt.compare(password, user!.password);

    if (!isMatchPassword) {
      const lastRequest = new Date(user!.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastRequest === today;

      if (!isSameDate) {
        const userData = {
          errorLoginCount: 1,
        };
        await updateUser(user!.id, userData);
      } else {
        if (user!.errorLoginCount >= 3) {
          const userData = {
            status: "FREEZE",
          };
          await updateUser(user!.id, userData);

          return next(
            createError(
              "Your account is feezed. Please contact to support center.",
              403,
              errorCodes.accountFreeze
            )
          );
        } else {
          const userData = {
            errorLoginCount: {
              increment: 1,
            },
          };
          await updateUser(user!.id, userData);

          return next(
            createError(req.t("wrongPassword"), 401, errorCodes.unauthenticated)
          );
        }
      }
    }

    const accessTokenPayLoad = { id: user!.id };
    const accessToken = jwt.sign(
      accessTokenPayLoad,
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: 15 * 60 }
    );

    const refreshTokenPayLoad = { id: user!.id, phone: user!.phone };
    const refreshToken = jwt.sign(
      refreshTokenPayLoad,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      }
    );

    const userData = {
      randToken: refreshToken,
      errorLoginCount: 0,
    };

    await updateUser(user!.id, userData);

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
      .status(200)
      .json({
        message: "successfully logged in.",
        userId: user!.id,
      });
  },
];

// logout
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    return next(
      createError(
        "You are not an authenticated user.",
        401,
        errorCodes.unauthenticated
      )
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
      id: number;
      phone: string;
    };
  } catch (error: any) {
    return next(createError("Invalid Refresh Token", 401, errorCodes.invalid));
  }

  const user = await getUserById(decoded.id);
  checkUserIfNotExist(user);

  if (user?.phone !== decoded.phone) {
    return next(
      createError(
        "You are not an authenticated user.",
        401,
        errorCodes.unauthenticated
      )
    );
  }

  const userData = {
    randToken: generateToken(),
  };
  await updateUser(user!.id, userData);

  res
    .status(200)
    .json({ message: "Successfully logged out." })
    .clearCookie("accessToken")
    .clearCookie("refreshToken");
};

// forget password
export const forgetPassword = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{11}$/)
    .withMessage("Phone number must be 11 digits"),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    let phone = req.body.phone;
    if (phone.slice(0, 2) == "09") {
      phone = phone.substring(2, phone.length);
    }

    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    const otp = 123456;
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);
    const rememberToken = generateToken();

    const otpRow = await getOtpByPhone(phone);

    let result;

    const lateOtpRequest = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lateOtpRequest === today;
    checkOtpErrorIfSameDate(isSameDate, otpRow!.errorCount);

    if (!isSameDate) {
      const otpData = {
        code: hashOtp,
        rememberToken,
        count: 1,
        errorCount: 0,
      };

      result = await updateOtp(otpRow!.id, otpData);
    } else {
      if (otpRow!.count === 3) {
        return next(
          createError(
            "OTP is allowed to request 3 times per day.",
            405,
            errorCodes.overLimit
          )
        );
      } else {
        const otpData = {
          code: hashOtp,
          rememberToken,
          count: {
            increment: 1,
          },
        };

        result = await updateOtp(otpRow!.id, otpData);
      }
    }

    res.status(200).json({
      message: `We are sending OTP to 09${result.phone}`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

// verify forget otp
export const verifyForgetOtp = [
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
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const { phone, otp, token } = req.body;
    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    const lateOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lateOtpVerify === today;
    checkOtpErrorIfSameDate(isSameDate, otpRow!.errorCount);

    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 2;
    if (isExpired) {
      return next(createError("OTP is expired.", 403, errorCodes.otpExpired));
    }

    if (otpRow?.rememberToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);
      return next(createError("Invalid token", 400, errorCodes.invalid));
    }

    const isMatchOtp = await bcrypt.compare(otp, otpRow!.code);

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

      return next(createError("OTP is incorrect.", 401, errorCodes.invalid));
    }

    const verifyToken = await generateToken();
    const otpData = {
      verifyToken,
      errorCount: 0,
      count: 1,
    };

    const result = await updateOtp(otpRow!.id, otpData);

    res.status(200).json({
      measssage: "OTP is successfully verified.",
      phone: result!.phone,
      token: result!.verifyToken,
    });
  },
];

// reset password
export const resetPassword = [
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
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const { phone, password, token } = req.body;

    const user = await getUserByPhone(phone);
    checkUserIfNotExist(user);

    const otpRow = await getOtpByPhone(phone);
    checkOtpRow(otpRow);

    if (otpRow?.errorCount === 5) {
      const error: any = new Error(
        "This request may be an attack.If not, try again tomorrow."
      );
      error.status = 400;
      error.errorCode = errorCodes.badRequest;
      throw error;
    }

    if (otpRow?.verifyToken !== token) {
      const otpData = {
        errorCount: 5,
      };
      await updateOtp(otpRow!.id, otpData);
      return next(createError("Invalid token", 400, errorCodes.invalid));
    }

    const isExpired = moment().diff(otpRow?.updatedAt, "minutes") > 10;
    if (isExpired) {
      return next(
        createError(
          "Your request is expired. Please try again.",
          403,
          errorCodes.requestExpired
        )
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const accessTokenPayLoad = { id: user!.id };
    const refreshTokenPayLoad = { id: user!.id, phone: user!.phone };

    const accessToken = jwt.sign(
      accessTokenPayLoad,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 15 * 60,
      }
    );

    const refreshToken = jwt.sign(
      refreshTokenPayLoad,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      }
    );

    const userUpdateData = {
      password: hashPassword,
      randToken: refreshToken,
    };

    await updateUser(user!.id, userUpdateData);

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
        message: "successfully reset your password.",
        userid: user!.id,
      });
  },
];
