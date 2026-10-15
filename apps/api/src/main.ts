import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
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

if (require.main === module)
  createApp()
    .then((app) => app.listen(Number(process.env.PORT ?? 3000)))
    .catch((error: unknown) => {
      process.stderr.write(String(error));
      process.exitCode = 1;
    });
