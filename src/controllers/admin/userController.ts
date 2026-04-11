import { Request, Response, NextFunction } from "express";

interface CustomRequest extends Request {
  userId: number;
  user: any;
}

export const getAllUsers: any = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const id = req.userId;
  const user = req.user;
  res
    .status(200)
    .json({ message: req.t("welcome"), currentUserId: id, currentUser: user });
};
