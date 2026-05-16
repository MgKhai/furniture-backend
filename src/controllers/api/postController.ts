import { Request, Response, NextFunction } from "express";
import { body, validationResult, param, check, query } from "express-validator";
import { createError } from "../../utils/error";
import { errorCodes } from "../../config/errorCodes";
import { checkUserIfNotExist } from "../../utils/auth";
import {
  getPostListsByPagination,
  getPostWithRelations,
} from "../../services/postService";
import { title } from "process";

interface CustomRequest extends Request {
  userId: number;
}

export const getPost: any = [
  param("id", "Invalid post ID").notEmpty().isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const userId = req.userId;
    await checkUserIfNotExist(userId);

    const postId = req.params.id;

    const post = await getPostWithRelations(+postId!);

    const modifiedPost = {
      id: post!.id,
      title: post!.title,
      content: post!.content,
      body: post!.body,
      image: post!.image,
      author: post!.author!.fullName,
      category: post!.category!.name,
      type: post!.type!.name,
      tags: post!.tags?.map((tag) => tag.name) || [],
      updatedAt: post!.updatedAt,
    };

    res
      .status(200)
      .json({ message: "Post retrieved successfully", post: modifiedPost });
  },
];

export const getPostsByOffset: any = [
  query("page", "Page number must be unsigned integer.")
    .isInt({ gt: 0 })
    .optional(),
  query("limits", "Limits must be unsigned integer.")
    .isInt({ gt: 4 })
    .optional(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const page = req.query.page || 1;
    const limits = req.query.limits || 5;

    const userId = req.userId;
    await checkUserIfNotExist(userId);

    const skip = (+page - 1) * +limits;
    const take = +limits + 1;

    const options = {
      skip,
      take,
      select: {
        id: true,
        title: true,
        content: true,
        body: true,
        image: true,
        author: {
          select: {
            fullName: true,
          },
        },
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    };

    const posts = await getPostListsByPagination(options);

    const hasNextPage = posts.length > +limits;
    let nextPage = null;
    if (hasNextPage) {
      posts.pop();
      nextPage = +page + 1;
    }

    const previousPage = page !== 1 ? +page - 1 : 0;

    res.status(200).json({
      message: "Post retrieved successfully",
      posts,
      hasNextPage,
      previousPage,
      currentPage: page,
      nextPage,
    });
  },
];

export const getPostsByCursor: any = [
  query("cursor", "Cursor number must be unsigned integer."),
  query("limits", "Limits must be unsigned integer."),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      console.log("error");
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const lastCursor = +req.query.cursor!;
    const limits = +req.query.limits! || 5;

    const userId = req.userId;
    await checkUserIfNotExist(userId);

    const options = {
      take: limits + 1,
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: lastCursor } : undefined,
      select: {
        id: true,
        title: true,
        content: true,
        body: true,
        image: true,
        author: {
          select: {
            fullName: true,
          },
        },
        updatedAt: true,
      },
      orderBy: {
        id: "asc",
      },
    };

    const posts = await getPostListsByPagination(options);

    const hasNextPage = posts.length > +limits;
    if (hasNextPage) {
      posts.pop();
    }

    const newCursor = posts.length > 0 ? posts[posts.length - 1]!.id : null;

    res.status(200).json({
      message: "Posts retrieved successfully.",
      posts,
      hasNextPage,
      newCursor,
    });
  },
];
