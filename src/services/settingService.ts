import { prisma } from "../lib/prisma";

export const getSettingStatus = async (key: string) => {
  return prisma.setting.findUnique({
    where: {
      key,
    },
  });
};

export const createOrUpdateSettingStatus = async (
  key: string,
  value: string
) => {
  return prisma.setting.upsert({
    where: {
      key,
    },
    create: {
      key,
      value,
    },
    update: {
      value,
    },
  });
};
