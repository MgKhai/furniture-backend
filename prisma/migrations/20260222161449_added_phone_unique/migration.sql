/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Otp` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Otp_phone_key" ON "Otp"("phone");
