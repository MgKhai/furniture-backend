import { Request, Response, NextFunction } from "express";
import { permission } from "process";
import { getUserById } from "../services/authService";
import { errorCodes } from "../config/errorCodes";

interface CustomRequest extends Request {
  userId: number;
  user: any;
}

export const authorise: any = (permissions: boolean, ...roles: string[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await getUserById(userId);

    if (!user) {
      const error: any = new Error("You are not an authenticated user.");
      error.status = 401;
      error.errorCode = errorCodes.unauthenticated;
      return next(error);
    }

    if (permissions && !roles.includes(user.role)) {
      const error: any = new Error("You are not an authorised user.");
      error.status = 403;
      error.errorCode = errorCodes.unauthorised;
      return next(error);
    }

    if (!permissions && roles.includes(user.role)) {
      const error: any = new Error("You are not an authorised user.");
      error.status = 403;
      error.errorCode = errorCodes.unauthorised;
      return next(error);
    }

    req.user = user;
    next();
  };
};
