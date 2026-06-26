import { Request, Response, NextFunction, RequestHandler } from "express";
import { body, check, param, validationResult, query } from "express-validator";
import { createError } from "../../utils/error";
import { errorCodes } from "../../config/errorCodes";
import { checkUserIfNotExist } from "../../utils/auth";
import {
  getCategoryList,
  getProductById,
  getProductListsByPagination,
  getProductWithRelations,
  getTypeList,
} from "../../services/productService";
import { getOrSetCache } from "../../utils/cache";
import { disconnect } from "cluster";
import { getUserById } from "../../services/authService";

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
    const user = await getUserById(+userId);
    await checkUserIfNotExist(user);

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

    res.status(200).json({
      message: "Product retrieved successfully",
      product: modifiedProduct,
    });
  },
];

// cursor-based pagination
// export const getProductsByCursor: any = [
//   query("cursor")
//     .optional()
//     .isInt({ gt: 0 })
//     .withMessage("Cursor number must be unsigned integer."),

//   query("limits")
//     .optional()
//     .isInt({ gt: 0 })
//     .withMessage("Limits must be unsigned integer."),

//   async (req: CustomRequest, res: Response, next: NextFunction) => {
//     try {
//       const errors = validationResult(req).array({
//         onlyFirstError: true,
//       });

//       if (errors.length > 0) {
//         return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
//       }

//       const lastCursor = Number(req.query.cursor) || 0;
//       const limits = Number(req.query.limits) || 5;

//       const categories = req.query.categories as string;
//       const types = req.query.types as string;

//       const userId = req.userId;
//       const user = await getUserById(+userId);
//       await checkUserIfNotExist(user);

//       const categoryList =
//         categories
//           ?.split(",")
//           .map((c) => Number(c))
//           .filter((id) => id > 0) || [];

//       const typeList =
//         types
//           ?.split(",")
//           .map((t) => Number(t))
//           .filter((id) => id > 0) || [];

//       const where: any = {};

//       if (categoryList.length > 0) {
//         where.categoryId = {
//           in: categoryList,
//         };
//       }

//       if (typeList.length > 0) {
//         where.typeId = {
//           in: typeList,
//         };
//       }

//       const options = {
//         where,

//         take: limits + 1,

//         skip: lastCursor ? 1 : 0,

//         cursor: lastCursor ? { id: lastCursor } : undefined,

//         select: {
//           id: true,
//           name: true,
//           description: true,
//           price: true,
//           discount: true,
//           status: true,

//           images: {
//             take: 1,
//             select: {
//               id: true,
//               path: true,
//             },
//           },
//         },

//         orderBy: {
//           id: "desc",
//         },
//       };

//       const cacheKey = `products:cursor:${lastCursor}:limits:${limits}`;
//       const products = await getOrSetCache(cacheKey, async () => {
//         return await getProductListsByPagination(options);
//       });

//       const formattedProducts = products.map((product: any) => ({
//         ...product,
//         images: product.images.map((image: any) => ({
//           ...image,
//           path: "/optimize/" + image.path.replace(/\.[^/.]+$/, ".webp"),
//         })),
//       }));

//       const hasNextPage = products.length > limits;

//       if (hasNextPage) {
//         products.pop();
//       }

//       const nextCursor =
//         products.length > 0 ? products[products.length - 1].id : null;

//       return res.status(200).json({
//         message: "Products retrieved successfully.",
//         products: formattedProducts,
//         hasNextPage,
//         nextCursor,
//         prevCursor: lastCursor,
//       });
//     } catch (error) {
//       next(error);
//     }
//   },
// ];

export const getProductsByCursor: any = [
  query("cursor", "Cursor must be Post ID.").isInt({ gt: 0 }).optional(),
  query("limits", "Limit number must be unsigned integer.")
    .isInt({ gt: 3 })
    .optional(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCodes.invalid));
    }

    const lastCursor = req.query.cursor;
    const limits = req.query.limits || 5;
    const category = req.query.category;
    const type = req.query.type;

    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExist(user);

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

    console.log("categoryList -----", categoryList);

    const where = {
      AND: [
        categoryList.length > 0 ? { categoryId: { in: categoryList } } : {},
        typeList.length > 0 ? { typeId: { in: typeList } } : {},
      ],
    };

    const options = {
      where,
      take: +limits + 1,
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: +lastCursor } : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        discount: true,
        status: true,
        images: {
          select: {
            id: true,
            path: true,
          },
          take: 1, // Limit to the first image
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

    const formattedProducts = products.map((product: any) => ({
      ...product,
      images: product.images.map((image: any) => ({
        ...image,
        path: "/optimize/" + image.path.replace(/\.[^/.]+$/, ".webp"),
      })),
    }));

    const hasNextPage = formattedProducts.length > +limits;

    if (hasNextPage) {
      formattedProducts.pop();
    }

    const nextCursor =
      formattedProducts.length > 0
        ? formattedProducts[formattedProducts.length - 1].id
        : null;

    res.status(200).json({
      message: "Get All infinite products",
      hasNextPage,
      nextCursor,
      prevCursor: lastCursor,
      products: formattedProducts,
    });
  },
];

export const getCategoryType: any = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const user = await getUserById(+userId);
  await checkUserIfNotExist(user);

  const categories = await getCategoryList();
  const types = await getTypeList();

  res.status(200).json({ message: "Categories & Types", categories, types });
};
