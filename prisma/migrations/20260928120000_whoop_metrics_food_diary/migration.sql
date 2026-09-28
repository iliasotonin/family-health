-- AlterTable
ALTER TABLE "Member" ADD COLUMN "kcalTarget" INTEGER;
ALTER TABLE "Member" ADD COLUMN "proteinTarget" INTEGER;

-- AlterTable
ALTER TABLE "WhoopDaily" ADD COLUMN "avgHr" INTEGER;
ALTER TABLE "WhoopDaily" ADD COLUMN "burnedKcal" INTEGER;
ALTER TABLE "WhoopDaily" ADD COLUMN "maxHr" INTEGER;
ALTER TABLE "WhoopDaily" ADD COLUMN "skinTempC" REAL;
ALTER TABLE "WhoopDaily" ADD COLUMN "spo2" REAL;
ALTER TABLE "WhoopDaily" ADD COLUMN "tzOffset" TEXT;

-- CreateTable
CREATE TABLE "FoodEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "eatenAt" DATETIME NOT NULL,
    "meal" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "kcal" INTEGER,
    "proteinG" REAL,
    "alcoholMl" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FoodEntry_memberId_eatenAt_idx" ON "FoodEntry"("memberId", "eatenAt");

