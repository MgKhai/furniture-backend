import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface CustomRequest extends Request {
  userId: number;
}

export const auth: any = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    const error: any = new Error("You are not an authenticated user.");
    error.status = 401;
    error.errorCode = "Error_Unauthenticated";
    return next(error);
  }

  if (!accessToken) {
    const error: any = new Error("Access Token has expired.");
    error.status = 401;
    error.errorCode = "Error_AccessTokenExpired";
    return next(error);
  }

  // Verify access token
  let decoded;
  try {
    decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as {
      id: number;
    };
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      const error: any = new Error("Access Token has expired.");
      error.status = 401;
      error.errorCode = "Error_AccessTokenExpired";
    } else {
      const error: any = new Error("Invalid Access Token.");
      error.status = 401;
      error.errorCode = "Error_InvalidAccessToken";
    }
    return next(error);
  }

  req.userId = decoded.id;
  next();
};
