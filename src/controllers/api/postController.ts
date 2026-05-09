import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

interface CustomRequest extends Request {
  userId: number;
}

export const getPost: any = [
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    res.status(200).json({ message: "Post retrieved successfully" });
  },
];

export const getPostsByPagination: any = [
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    res.status(200).json({ message: "Posts retrieved successfully" });
  },
];
