import { product } from "./../../../node_modules/effect/src/Equivalence";
import { Request, Response, NextFunction } from "express";
import { body, check, validationResult } from "express-validator";
import { createError } from "../../utils/error";
import { errorCodes } from "../../config/errorCodes";
import { unlink } from "fs/promises";
import path from "path";
import { checkUserIfNotExist } from "../../utils/auth";
import { checkUploadFile } from "../../utils/upload";
import imageQueue from "../../jobs/queues/imagQueue";
import cacheQueue from "../../jobs/queues/cacheQueue";
import {
  createNewProduct,
  deleteProductById,
  getProductById,
  updateProductById,
} from "../../services/productService";

interface CustomRequest extends Request {
  userId: number;
  files: any;
}

// model Product {
//   id          Int     @id @default(autoincrement())
//   name        String  @db.VarChar(255)
//   description String
//   price       Decimal   @db.Decimal(10, 2)
//   discount    Decimal   @db.Decimal(10, 2) @default(0)
//   rating      Int       @db.SmallInt    @default(0)
//   inventory   Int       @default(0)
//   status      Status    @default(ACTIVE)
//   categoryId  Int
//   category    Category @relation(fields: [categoryId], references: [id])
//   typeId      Int
//   type        Type     @relation(fields: [typeId], references: [id])
//   createdAt   DateTime @default(now())
//   updatedAt   DateTime @updatedAt
//   images      Image[]
//   orders  ProductsOnOrder[]
//   tags       ProductTag[]
// }

const removeFiles = async (
  originalFiles: string[],
  optimizeFiles: string[] | null
) => {
  try {
    for (const originalFile of originalFiles) {
      const originalFilePath = path.join(
        __dirname,
        "../../uploads/images",
        originalFile
      );
      await unlink(originalFilePath);
    }

    if (optimizeFiles) {
      for (const optimizeFile of optimizeFiles) {
        const optimizeFilePath = path.join(
          __dirname,
          "../../uploads/optimize",
          optimizeFile
        );
        await unlink(optimizeFilePath);
      }
    }
  } catch (error) {
    console.error("Error deleting images");
  }
};

export const createProduct: any = [
  body("name", "Name is required.").trim().notEmpty().escape(),
  body("description", "Description is required.").trim().notEmpty().escape(),
  body("price", "Price is required.")
    .isFloat({ min: 0 })
    .isDecimal({ decimal_digits: "1,2" }),
  body("discount", "Discount is required.")
    .isFloat({ min: 0 })
    .isDecimal({ decimal_digits: "1,2" }),
  body("inventory", "Inventory is required.").isInt({ min: 0 }),
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
      if (req.files && req.files.length > 0) {
        const originalFileNames = req.files.map((file: any) => file.filename);
        await removeFiles(originalFileNames, null);
      }
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const {
      name,
      description,
      price,
      discount,
      inventory,
      category,
      type,
      tags,
    } = req.body;

    const userId = req.userId;
    await checkUserIfNotExist(userId);
    await checkUploadFile(req.files);

    await Promise.all(
      req.files.map(async (file: any) => {
        const splitFileName = file!.filename.split(".")[0];
        return imageQueue.add(
          "optimizeImage",
          {
            filePath: file!.path,
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
      })
    );

    const originalFileNames = req.files.map((file: any) => file.filename);
    const productData = {
      name,
      description,
      price,
      discount,
      inventory: +inventory,
      category,
      type,
      tags,
      images: originalFileNames,
    };

    const newProduct = await createNewProduct(productData);

    await cacheQueue.add(
      "invalidateCache",
      {
        pattern: "products:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({
      message: "Product created successfully",
      productId: newProduct.id,
    });
  },
];

export const updateProduct: any = [
  body("productId", "Product ID is required.")
    .trim()
    .notEmpty()
    .isInt({ min: 1 }),
  body("name", "Name is required.").trim().notEmpty().escape(),
  body("description", "Description is required.").trim().notEmpty().escape(),
  body("price", "Price is required.")
    .isFloat({ min: 0 })
    .isDecimal({ decimal_digits: "1,2" }),
  body("discount", "Discount is required.")
    .isFloat({ min: 0 })
    .isDecimal({ decimal_digits: "1,2" }),
  body("inventory", "Inventory is required.").isInt({ min: 0 }),
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
      if (req.files && req.files.length > 0) {
        const originalFileNames = req.files.map((file: any) => file.filename);
        await removeFiles(originalFileNames, null);
      }
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const userId = req.userId;
    await checkUserIfNotExist(userId);

    const {
      productId,
      name,
      description,
      price,
      discount,
      inventory,
      category,
      type,
      tags,
    } = req.body;

    const product = await getProductById(+productId);
    if (!product) {
      if (req.files && req.files.length > 0) {
        const originalFileNames = req.files.map((file: any) => file.filename);
        await removeFiles(originalFileNames, null);
      }
      return next(createError("Product not found", 404, errorCodes.notFound));
    }

    await Promise.all(
      req.files.map(async (file: any) => {
        const splitFileName = file!.filename.split(".")[0];
        return imageQueue.add(
          "optimizeImage",
          {
            filePath: file!.path,
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
      })
    );

    const updateProductData = {
      name,
      description,
      price,
      discount,
      inventory: +inventory,
      category,
      type,
      tags,
      images: [],
    };

    if (req.files && req.files.length > 0) {
      const newFileNames = req.files.map((file: any) => file.filename);
      updateProductData.images = newFileNames;

      const existingOriginalFileNames = product.images.map(
        (image: any) => image.path
      );
      const existingOptimizeFileNames = product.images.map(
        (image: any) => image.path.split(".")[0] + ".webp"
      );

      await removeFiles(existingOriginalFileNames, existingOptimizeFileNames);
    }

    const updatedProduct = await updateProductById(
      +productId,
      updateProductData
    );

    await cacheQueue.add(
      "invalidateCache",
      {
        pattern: "products:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  },
];

export const deleteProduct: any = [
  body("productId", "Product ID is required.")
    .trim()
    .notEmpty()
    .isInt({ min: 1 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const userId = req.userId;
    await checkUserIfNotExist(userId);

    const { productId } = req.body;
    const product = await getProductById(+productId);
    if (!product) {
      return next(createError("Product not found", 404, errorCodes.notFound));
    }

    const originalFileNames = product.images.map((image: any) => image.path);
    const optimizeFileNames = product.images.map(
      (image: any) => image.path.split(".")[0] + ".webp"
    );

    await removeFiles(originalFileNames, optimizeFileNames);

    await deleteProductById(+productId);

    await cacheQueue.add(
      "invalidateCache",
      {
        pattern: "products:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({ message: "Product deleted successfully" });
  },
];
