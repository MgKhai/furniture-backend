import { maintenance } from "../middleware/maintenance";

export const errorCodes = {
  invalid: "Error_Invalid",
  unauthenticated: "Error_Unauthenticated",
  attack: "Error_Attack",
  accessTokenExpired: "Error_AccessTokenExpired",
  userExist: "Error_UserAlreadyExist",
  overLimit: "Error_OverLimit",
  otpExpired: "Error_OtpExpired",
  requestExpired: "Error_RequestExpired",
  accountFreeze: "Error_AccountFreeze",
  badRequest: "Error_BadRequest",
  unauthorised: "Error_Unauthorised",
  maintenance: "Error_Maintenance",
  notFound: "Error_NotFound",
};
