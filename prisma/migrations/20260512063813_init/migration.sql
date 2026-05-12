-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "fontFamily" TEXT,
    "tone" TEXT,
    "feeling" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApiKey" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "label" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalToken" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExternalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowVersion" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "versionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRun" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "articleUrl" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "outputData" JSONB,
    "userInput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BrandKit_userId_key" ON "BrandKit"("userId");

-- CreateIndex
CREATE INDEX "UserApiKey_userId_idx" ON "UserApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserApiKey_userId_provider_key" ON "UserApiKey"("userId", "provider");

-- CreateIndex
CREATE INDEX "Flow_userId_idx" ON "Flow"("userId");

-- CreateIndex
CREATE INDEX "FlowVersion_flowId_idx" ON "FlowVersion"("flowId");

-- CreateIndex
CREATE INDEX "ExecutionRun_flowId_idx" ON "ExecutionRun"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPost_postId_key" ON "FacebookPost"("postId");

-- CreateIndex
CREATE INDEX "ExecutionLog_runId_idx" ON "ExecutionLog"("runId");

-- CreateIndex
CREATE INDEX "ExecutionLog_nodeId_idx" ON "ExecutionLog"("nodeId");

-- AddForeignKey
ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApiKey" ADD CONSTRAINT "UserApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalToken" ADD CONSTRAINT "ExternalToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowVersion" ADD CONSTRAINT "FlowVersion_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
