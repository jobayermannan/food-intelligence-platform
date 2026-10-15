import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import type { Request, Response } from "express";
import { AppModule } from "./app.module";
import { authConfig } from "./config";
import { trustProxyHops } from "./proxy";

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const proxyHops = trustProxyHops();
  if (proxyHops !== undefined) {
    const express = app.getHttpAdapter().getInstance() as {
      set(name: string, value: number): void;
    };
    express.set("trust proxy", proxyHops);
  }
  app.use(cookieParser());
  app.enableCors({ origin: authConfig().origins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.SWAGGER_ENABLED !== "false");
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("Food Intelligence Platform API")
      .setVersion("2.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      "/api/docs",
      app,
      SwaggerModule.createDocument(app, config),
    );
  }
  app.enableShutdownHooks();
  return app;
}

let serverlessApp: ReturnType<typeof createApp> | undefined;

/**
 * Vercel invokes the default export for every request.  Cache the initialized
 * Nest application at module scope so warm serverless invocations reuse it.
 */
export default async function handler(req: Request, res: Response) {
  serverlessApp ??= createApp().then(async (app) => {
    await app.init();
    return app;
  });

  const app = await serverlessApp;
  return app.getHttpAdapter().getInstance()(req, res);
}

if (require.main === module)
  createApp()
    .then((app) => app.listen(Number(process.env.PORT ?? 3000)))
    .catch((error: unknown) => {
      process.stderr.write(String(error));
      process.exitCode = 1;
    });
