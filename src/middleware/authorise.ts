import { Request, Response, NextFunction } from "express";
import { getUserById } from "../services/authService";
import { errorCodes } from "../config/errorCodes";
import { createError } from "../utils/error";

interface CustomRequest extends Request {
  userId: number;
  user: any;
}

export const authorise: any = (permissions: boolean, ...roles: string[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await getUserById(userId);

    if (!user) {
      return next(
        createError(
          "You are not an authenticated user.",
          401,
          errorCodes.unauthenticated
        )
      );
    }

    if (permissions && !roles.includes(user.role)) {
      return next(
        createError(
          "You are not an authenticated user.",
          403,
          errorCodes.unauthenticated
        )
      );
    }

    if (!permissions && roles.includes(user.role)) {
      return next(
        createError(
          "You are not an authenticated user.",
          403,
          errorCodes.unauthenticated
        )
      );
    }

    req.user = user;
    next();
  };
};
