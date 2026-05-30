import { Request, Response, NextFunction, RequestHandler } from "express";
import { body, check, param, validationResult, query } from "express-validator";
import { createError } from "../../utils/error";
import { errorCodes } from "../../config/errorCodes";
import { checkUserIfNotExist } from "../../utils/auth";
import {
  getProductById,
  getProductListsByPagination,
  getProductWithRelations,
} from "../../services/productService";
import { getOrSetCache } from "../../utils/cache";
import { disconnect } from "cluster";

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

// cursor-based pagination
export const getProductsByCursor: any = [
  query("cursor", "Cursor number must be unsigned integer.")
    .isInt({ gt: 0 })
    .optional(),
  query("limits", "Limits must be unsigned integer.")
    .isInt({ gt: 0 })
    .optional(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      console.log("error");
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const lastCursor = +req.query.cursor!;
    const limits = +req.query.limits! || 5;
    const category = req.query.category as string;
    const type = req.query.type as string;

    const userId = req.userId;
    await checkUserIfNotExist(userId);

    let categoryList: number[] = [];
    let typeList: number[] = [];

    if (category) {
      categoryList = category
        .toString()
        .split(",")
        .map((c) => Number(c))
        .filter((c) => c > 0);
    }

    if (type) {
      typeList = type
        .toString()
        .split(",")
        .map((t) => Number(t))
        .filter((t) => t > 0);
    }

    const where = {
      OR: [
        categoryList.length > 0 ? { categoryId: { in: categoryList } } : {},
        typeList.length > 0 ? { typeId: { in: typeList } } : {},
      ],
    };

    const options = {
      where,
      take: +limits + 1,
      skip: lastCursor ? 1 : 0, // skip the last cursor if it exists
      cursor: lastCursor ? { id: +lastCursor } : undefined,
      select: {
        id: true,
        name: true,
        price: true,
        discount: true,
        status: true,
        images: {
          select: {
            id: true,
            path: true,
          },
          take: 1, // limit to the first image
        },
      },
      orderBy: {
        id: "desc",
      },
    };

    const cacheKey = `products:${JSON.stringify(req.query)}`;

    const products = await getOrSetCache(cacheKey, async () => {
      return await getProductListsByPagination(options);
    });

    const hasNextPage = products.length > +limits;
    if (hasNextPage) {
      products.pop();
    }

    const newCursor =
      products.length > 0 ? products[products.length - 1]!.id : null;

    res.status(200).json({
      message: "Products retrieved successfully.",
      products,
      hasNextPage,
      newCursor,
    });
  },
];
