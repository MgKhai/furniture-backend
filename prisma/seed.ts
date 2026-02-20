import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  const users = faker.helpers.multiple(
    () => ({
      phone: faker.phone.number({ style: "international" }),
      password: "12345678",
      randToken: faker.internet.jwt(),
    }),
    { count: 10 }
  );

  const salt = await bcrypt.genSalt(10);

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, salt);
    await prisma.user.create({
      data: {
        phone: user.phone,
        password: hashedPassword,
        randToken: user.randToken,
      },
    });
  }

  console.log("Seeding completed");
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
