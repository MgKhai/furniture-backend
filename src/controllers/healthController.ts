import { Request, Response } from "express";

interface CustomRequest extends Request {
  userId?: number;
}

export const healthCheck = (req: CustomRequest, res: Response) => {
  res.status(200).json({
    message: "Hello World",
    userId: req.userId || 4,
  });
};
