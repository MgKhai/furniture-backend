import { disconnect } from "node:cluster";
import { any } from "./../../node_modules/effect/src/Match";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// create product
export const createNewProduct = async (data: any) => {
  const productData: any = {
    name: data.name,
    description: data.description,
    price: data.price,
    discount: data.discount,
    inventory: data.inventory,

    category: {
      connectOrCreate: {
        where: {
          name: data.category,
        },
        create: {
          name: data.category,
        },
      },
    },

    type: {
      connectOrCreate: {
        where: {
          name: data.type,
        },
        create: {
          name: data.type,
        },
      },
    },

    images: {
      create: data.images.map((image: string) => ({
        path: image,
      })),
    },
  };

  if (data.tags && data.tags.length > 0) {
    productData.tags = {
      connectOrCreate: data.tags.map((tag: string) => ({
        where: {
          name: tag,
        },
        create: {
          name: tag,
        },
      })),
    };
  }

  return prisma.product.create({
    data: productData,
  });
};

// update product
export const updateProductById = async (
  productId: number,
  productData: any
) => {
  // productId,
  // name,
  // description,
  // price,
  // discount,
  // inventory,
  // category,
  // type,
  // tags,
  let data: any = {
    name: productData.title,
    description: productData.description,
    price: productData.price,
    discount: productData.discount,
    inventory: productData.inventory,
    category: {
      connectOrCreate: {
        where: {
          name: productData.category,
        },
        create: {
          name: productData.category,
        },
      },
    },
    type: {
      connectOrCreate: {
        where: {
          name: productData.type,
        },
        create: {
          name: productData.type,
        },
      },
    },
    images: {
      deleteMany: {}, // remove existing images
      create: productData.images.map((image: string) => ({
        path: image,
      })),
    },
  };

  if (productData.tags && productData.tags.length > 0) {
    data.tags = {
      set: [], // remove existing tags
      connectOrCreate: productData.tags.map((tag: any) => ({
        where: {
          name: tag,
        },
        create: {
          name: tag,
        },
      })),
    };
  }

  return prisma.post.update({
    where: {
      id: productId,
    },
    data,
  });
};

// get product by id
export const getProductById = async (id: number) => {
  return prisma.product.findUnique({
    where: {
      id,
    },
    include: {
      images: true,
    },
  });
};
