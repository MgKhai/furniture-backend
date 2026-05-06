import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errorCodes } from "../config/errorCodes";
import { getUserById, updateUser } from "../services/authService";
import { checkUserIfNotExist } from "../utils/auth";
import { createError } from "../utils/error";

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
    return next(
      createError(
        "You are not an authenticated user.",
        401,
        errorCodes.unauthenticated
      )
    );
  }

  const generateNewTokens = async () => {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
        id: number;
        phone: string;
      };
    } catch (error) {
      return next(
        createError(
          "You are not an unauthenticated user.",
          401,
          errorCodes.unauthenticated
        )
      );
    }

    if (isNaN(decoded!.id)) {
      return next(
        createError(
          "You are not an unauthenticated user.",
          401,
          errorCodes.unauthenticated
        )
      );
    }

    const user = await getUserById(decoded!.id);
    await checkUserIfNotExist(user);

    if (user!.phone !== decoded!.phone) {
      return next(
        createError(
          "You are not an unauthenticated user.",
          401,
          errorCodes.unauthenticated
        )
      );
    }

    if (user!.randToken !== refreshToken) {
      return next(
        createError(
          "You are not an unauthenticated user.",
          401,
          errorCodes.unauthenticated
        )
      );
    }

    const newAcessTokenPayload = { id: user!.id };
    const newAccessToken = jwt.sign(
      newAcessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 15 * 60,
      }
    );

    const newRefreshTokenPayload = { id: user!.id, phone: user!.phone };
    const newRefreshToken = jwt.sign(
      newRefreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d",
      }
    );

    const newUserData = {
      randToken: newRefreshToken,
    };

    await updateUser(user!.id, newUserData);

    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      })
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 60 * 60 * 1000, // 30 days
      });

    req.userId = user!.id;
    next();
  };

  if (!accessToken) {
    generateNewTokens();
  } else {
    // Verify access token
    let decoded;
    try {
      decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as {
        id: number;
      };

      if (isNaN(decoded!.id)) {
        return next(
          createError(
            "You are not an unauthenticated user.",
            401,
            errorCodes.unauthenticated
          )
        );
      }

      req.userId = decoded.id;
      next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        generateNewTokens();
      } else {
        return next(
          createError("Access Token is invalid.", 401, errorCodes.attack)
        );
      }
    }
  }
};
