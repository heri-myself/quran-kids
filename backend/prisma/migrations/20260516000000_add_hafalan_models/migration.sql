-- CreateTable "HafalanSession"
CREATE TABLE "HafalanSession" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "totalVerses" INTEGER NOT NULL,
    "avgScore" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HafalanSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable "HafalanVerseResult"
CREATE TABLE "HafalanVerseResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "verseNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "wordResults" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HafalanVerseResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HafalanSession_profileId_idx" ON "HafalanSession"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "HafalanVerseResult_sessionId_verseNumber_key" ON "HafalanVerseResult"("sessionId", "verseNumber");

-- CreateIndex
CREATE INDEX "HafalanVerseResult_sessionId_idx" ON "HafalanVerseResult"("sessionId");

-- AddForeignKey
ALTER TABLE "HafalanSession" ADD CONSTRAINT "HafalanSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HafalanVerseResult" ADD CONSTRAINT "HafalanVerseResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HafalanSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
