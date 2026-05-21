import { any } from "./../../node_modules/effect/src/Match";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
      create: {
        data: data.images,
      },
    },
  };

  if (data.tags && data.tags.length > 0) {
    productData.tags = {
      connectOrCreate: data.tags.map((tag: any) => ({
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
    data,
  });
};
