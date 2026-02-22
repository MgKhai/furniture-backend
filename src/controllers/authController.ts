import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { body, check, validationResult } from "express-validator";
import {
  createOtp,
  getOtpByPhone,
  getUserByPhone,
  updateOtp,
} from "../services/authService";
import { checkOtpErrorIfSameDate, checkUserExist } from "../utils/auth";
import { generateOTP, generateToken } from "../utils/generate";

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

    const otp = generateOTP();
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
          error: 0,
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

    res.status(200).json({ message: result });
  },
];
