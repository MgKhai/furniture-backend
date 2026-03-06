import { errorCodes } from "../config/errorCodes";
export const checkUserExist = (user: any) => {
  if (user) {
    const error: any = new Error(
      "This phone number has already been registered"
    );
    error.status = 401;
    error.errorCode = errorCodes.userExist;
    throw error;
  }
};

export const checkUserIfNotExist = (user: any) => {
  if (!user) {
    const error: any = new Error("This phone number has not registered");
    error.status = 401;
    error.errorCode = errorCodes.unauthenticated;
    throw error;
  }
};

export const checkOtpErrorIfSameDate = async (
  isSameDate: boolean,
  errorCount: number
) => {
  if (isSameDate && errorCount === 5) {
    const error: any = new Error(
      "OTP is wrong for 5 times. Please try again tomorrow."
    );
    error.status = 401;
    error.code = errorCodes.overLimit;
    throw error;
  }
};

export const checkOtpRow = (otpRow: any) => {
  if (!otpRow) {
    const error: any = new Error("Phone number is incorrect.");
    error.status = 400;
    error.errorCode = errorCodes.invalid;
    throw error;
  }
};
