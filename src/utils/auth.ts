export const checkUserExist = (user: any) => {
  if (user) {
    const error: any = new Error(
      "This phone number has already been registered"
    );
    error.status = 401;
    error.errorCode = "Error_AlreadyExit";
    throw error;
  }
};

export const checkUserIfNotExist = (user: any) => {
  if (!user) {
    const error: any = new Error("This phone number has not registered");
    error.status = 401;
    error.errorCode = "Error_Unauthenticated";
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
    error.code = "Error_OverLimit";
    throw error;
  }
};

export const checkOtpRow = (otpRow: any) => {
  if (!otpRow) {
    const error: any = new Error("Phone number is incorrect.");
    error.status = 400;
    error.errorCode = "Error_Invalid";
    throw error;
  }
};
