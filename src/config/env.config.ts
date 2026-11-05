import { registerAs } from '@nestjs/config';

export interface IEnv {
  APPLICATION: {
    NODE_ENV: string;
    PORT: string;
    API_PREFIX: string;
    APP_NAME: string;
    APP_URL: string;
  };
  DATABASE: {
    DATABASE_URL: string;
    DATABASE_POOL_MIN: string;
    DATABASE_POOL_MAX: string;
  };
  JWT_CONFIG: {
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
  };
  SMTP_EMAIL_CONFIG: {
    EMAIL_HOST: string;
    EMAIL_PORT: string;
    EMAIL_USER: string;
    EMAIL_PASSWORD: string;
    EMAIL_FROM: string;
    EMAIL_FROM_NAME: string;
  };
  CLOUDINARY_CONFIG: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
  };
  PAYMENT: {
    PLATFORM_FEE_PERCENTAGE: string;
    PLATFORM_TAX_PERCENTAGE: string;
  };
  ADMIN_CONFIG: {
    SUPER_ADMIN_EMAIL: string;
    SUPER_ADMIN_PASSWORD: string;
  };
}

// Check critical env without crashing startup if optional ones are missing
function envChecker() {
  const critical = ['DATABASE_URL', 'JWT_SECRET'];
  critical.forEach((key) => {
    if (!process.env[key]) {
      console.warn(`⚠️ Warning: Critical environment variable missing: ${key}`);
    }
  });
}

export default registerAs('env', (): IEnv => {
  envChecker();

  const appUrl =
    process.env.APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || '3000'}`);

  return {
    APPLICATION: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '3000',
      API_PREFIX: process.env.API_PREFIX || 'api/v1',
      APP_NAME: process.env.APP_NAME || 'Protiva Book Store API',
      APP_URL: appUrl,
    },
    DATABASE: {
      DATABASE_URL: process.env.DATABASE_URL || '',
      DATABASE_POOL_MIN: process.env.DATABASE_POOL_MIN || '1',
      DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX || '10',
    },
    JWT_CONFIG: {
      JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-for-startup',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    SMTP_EMAIL_CONFIG: {
      EMAIL_HOST: process.env.EMAIL_HOST || '',
      EMAIL_PORT: process.env.EMAIL_PORT || '587',
      EMAIL_USER: process.env.EMAIL_USER || '',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
      EMAIL_FROM: process.env.EMAIL_FROM || '',
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Protiva',
    },
    CLOUDINARY_CONFIG: {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    },
    PAYMENT: {
      PLATFORM_FEE_PERCENTAGE: process.env.PLATFORM_FEE_PERCENTAGE || '0',
      PLATFORM_TAX_PERCENTAGE: process.env.PLATFORM_TAX_PERCENTAGE || '0',
    },
    ADMIN_CONFIG: {
      SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || '',
      SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || '',
    },
  };
});
