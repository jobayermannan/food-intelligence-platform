import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { authConfig } from "./config";

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(cookieParser());
  app.enableCors({ origin: authConfig().origin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
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
