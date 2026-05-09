import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { createError } from "../../utils/error";
import { errorCodes } from "../../config/errorCodes";
import { get } from "http";
import { getUserById } from "../../services/authService";
import { checkUserIfNotExist } from "../../utils/auth";
import { checkUploadFile } from "../../utils/upload";
import imageQueue from "../../jobs/queues/imagQueue";
import { createNewPost, PostArgs } from "../../services/postService";

interface CustomRequest extends Request {
  userId: number;
}

// model Post {
//   id        Int     @id @default(autoincrement())
//   title     String @db.VarChar(255)
//   content   String
//   body      String
//   image     String?
//   authorId  Int
//   author    User @relation(fields: [authorId], references: [id])
//   categoryId  Int
//   category    Category @relation(fields: [categoryId], references: [id])
//   typeId      Int
//   type        Type     @relation(fields: [typeId], references: [id])
//   tags       PostTag[]
//   published Boolean @default(false)
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }

export const createPost: any = [
  body("title", "Title is required.").trim().notEmpty().escape(),
  body("content", "Content is required.").trim().notEmpty().escape(),
  body("body", "Body is required.").trim().notEmpty().escape(),
  body("category", "Category is required.").trim().notEmpty().escape(),
  body("type", "Type is required.").trim().notEmpty().escape(),
  body("tags", "Tag is invalid.")
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value) {
        return value.split(",").filter((tag: string) => tag.trim() !== "");
      }
      return value;
    }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const { title, content, body, category, type, tags } = req.body;
    const image = req.file;

    const user = await getUserById(req.userId);
    await checkUserIfNotExist(user);
    await checkUploadFile(image!);

    const splitFileName = image!.filename.split(".")[0];
    const job = await imageQueue.add(
      "optimizeImage",
      {
        filePath: image!.path,
        fileName: `${splitFileName}.webp`,
        width: 835,
        height: 577,
        quality: 100,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000, // 1 seconds
        },
      }
    );

    const data: PostArgs = {
      title,
      content,
      body,
      image: image!.filename,
      authorId: req.userId,
      category,
      type,
      tags,
    };

    const newPost = await createNewPost(data);

    res
      .status(200)
      .json({ message: "Post created successfully", postId: newPost.id });
  },
];

export const updatePost: any = [
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    res.status(200).json({ message: "Post updated successfully" });
  },
];

export const deletePost: any = [
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    res.status(200).json({ message: "Post deleted successfully" });
  },
];
