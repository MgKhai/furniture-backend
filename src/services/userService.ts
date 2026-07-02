import { prisma } from "../lib/prisma";

export const addProductToFavourite = async (
  userId: number,
  productId: number
) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      products: {
        connect: {
          id: productId,
        },
      },
    },
  });
};

export const removeProductToFavourite = async (
  userId: number,
  productId: number
) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      products: {
        disconnect: {
          id: productId,
        },
      },
    },
  });
};
