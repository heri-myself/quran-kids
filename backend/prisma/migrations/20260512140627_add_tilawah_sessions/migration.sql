-- CreateTable
CREATE TABLE "TilawahSession" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TilawahSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TilawahVerseResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "verseNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "wordAccuracy" INTEGER NOT NULL,
    "tajweedScore" INTEGER NOT NULL,
    "feedback" JSONB NOT NULL,

    CONSTRAINT "TilawahVerseResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TilawahSession" ADD CONSTRAINT "TilawahSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TilawahVerseResult" ADD CONSTRAINT "TilawahVerseResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TilawahSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
