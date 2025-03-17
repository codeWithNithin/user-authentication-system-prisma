/*
  Warnings:

  - You are about to drop the column `verficationToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "verficationToken",
ADD COLUMN     "verificationToken" TEXT;
