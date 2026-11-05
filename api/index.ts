import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response, NextFunction } from 'express';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HttpExceptionFilter,
  PrismaExceptionFilter,
} from '../src/common/filters';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from '../src/common/interceptors';
import {
  setupSecurity,
  setupSwagger,
} from '../src/common/server/server.main.file';

const server: Express = express();
let cachedApp: INestApplication | null = null;

// Rewrites on Vercel can alter req.url; preserve original request path
server.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.originalUrl && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  }
  next();
});

async function bootstrapServer(expressInstance: Express): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'production';

  // Root healthcheck (handles both '/' and '/api')
  expressInstance.get(['/', '/api'], (_req: Request, res: Response) => {
    res.status(200).json({
      statusCode: 200,
      message: 'Success',
      meta: null,
      data: `${configService.get<string>('APP_NAME') || 'Protiva Book Store API'} Running Successfully!`,
      timestamp: new Date().toISOString(),
    });
  });

  // Swagger UI assets for Serverless environments (CDN fallback + trailing slash redirect)
  const swaggerCDN = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2';
  expressInstance.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/docs') {
      return res.redirect(301, '/docs/');
    }
    next();
  });
  expressInstance.get(['/docs/swagger-ui.css', '/docs/docs/swagger-ui.css'], (_req: Request, res: Response) => {
    res.redirect(302, `${swaggerCDN}/swagger-ui.min.css`);
  });
  expressInstance.get(['/docs/swagger-ui-bundle.js', '/docs/docs/swagger-ui-bundle.js'], (_req: Request, res: Response) => {
    res.redirect(302, `${swaggerCDN}/swagger-ui-bundle.js`);
  });
  expressInstance.get(['/docs/swagger-ui-standalone-preset.js', '/docs/docs/swagger-ui-standalone-preset.js'], (_req: Request, res: Response) => {
    res.redirect(302, `${swaggerCDN}/swagger-ui-standalone-preset.js`);
  });
  expressInstance.get(['/docs/favicon-32x32.png', '/docs/docs/favicon-32x32.png'], (_req: Request, res: Response) => {
    res.redirect(302, `${swaggerCDN}/favicon-32x32.png`);
  });
  expressInstance.get(['/docs/favicon-16x16.png', '/docs/docs/favicon-16x16.png'], (_req: Request, res: Response) => {
    res.redirect(302, `${swaggerCDN}/favicon-16x16.png`);
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  setupSecurity(app, configService, nodeEnv);

  const { httpAdapter } = app.get(HttpAdapterHost);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(httpAdapter),
  );
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  setupSwagger(app, nodeEnv, 3000, configService);

  await app.init();
  return app;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    if (!cachedApp) {
      cachedApp = await bootstrapServer(server);
    }
    return server(req, res);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Serverless bootstrap error:', err);
    res.status(500).json({
      statusCode: 500,
      error: 'FUNCTION_INVOCATION_FAILED',
      message: err.message || 'Server failed to initialize',
      timestamp: new Date().toISOString(),
    });
  }
}
