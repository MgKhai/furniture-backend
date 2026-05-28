import { Request, Response, NextFunction, RequestHandler } from "express";
import { body, check, param, validationResult } from "express-validator";
import { createError } from "../../utils/error";
import { errorCodes } from "../../config/errorCodes";
import { checkUserIfNotExist } from "../../utils/auth";
import {
  getProductById,
  getProductWithRelations,
} from "../../services/productService";
import { getOrSetCache } from "../../utils/cache";

interface CustomRequest extends Request {
  userId: number;
}

export const getProduct: any = [
  param("id", "Invalid post ID").notEmpty().isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const userId = req.userId;
    await checkUserIfNotExist(userId);

    const productId = req.params.id;
    const checkProduct = await getProductById(+productId!);

    if (!checkProduct) {
      return next(createError("Product not found.", 404, errorCodes.notFound));
    }

    const cacheData = `product:id:${productId}`;
    const product = await getOrSetCache(cacheData, async () => {
      return await getProductWithRelations(+productId!);
    });

    const modifiedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      rating: product.rating,
      inventory: product.inventory,
      category: product.category.name,
      type: product.type.name,
      tags: product.tags.map((tag: any) => tag.name),
      images: product.images.map((image: any) => image.path),
    };

    res
      .status(200)
      .json({ message: "Product retrieved successfully", modifiedProduct });
  },
];
