import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface RoleSeedConfig {
  email: string;
  password: string;
  userName: string;
  role: UserRole;
}

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  async onApplicationBootstrap() {
    await this.seedRoles();
  }

  async seedRoles(): Promise<void> {
    try {
      this.logger.log('Checking database seed users for all roles...');

      const adminEmail =
        this.configService.get<string>('SUPER_ADMIN_EMAIL') ||
        this.configService.get<string>('env.ADMIN_CONFIG.SUPER_ADMIN_EMAIL') ||
        process.env.SUPER_ADMIN_EMAIL;

      const adminPassword =
        this.configService.get<string>('SUPER_ADMIN_PASSWORD') ||
        this.configService.get<string>('env.ADMIN_CONFIG.SUPER_ADMIN_PASSWORD') ||
        process.env.SUPER_ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        this.logger.warn(
          'SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in environment. Skipping admin seed.',
        );
      }

      const moderatorEmail =
        this.configService.get<string>('env.ADMIN_CONFIG.MODERATOR_EMAIL') ||
        this.configService.get<string>('MODERATOR_EMAIL') ||
        process.env.MODERATOR_EMAIL ||
        (adminEmail ? `moderator@${adminEmail.split('@')[1] || 'bookproject.com'}` : 'moderator@bookproject.com');

      const moderatorPassword =
        this.configService.get<string>('env.ADMIN_CONFIG.MODERATOR_PASSWORD') ||
        this.configService.get<string>('MODERATOR_PASSWORD') ||
        process.env.MODERATOR_PASSWORD ||
        adminPassword ||
        'Moderator@123456';

      const userEmail =
        this.configService.get<string>('env.ADMIN_CONFIG.USER_EMAIL') ||
        this.configService.get<string>('USER_EMAIL') ||
        process.env.USER_EMAIL ||
        (adminEmail ? `user@${adminEmail.split('@')[1] || 'bookproject.com'}` : 'user@bookproject.com');

      const userPassword =
        this.configService.get<string>('env.ADMIN_CONFIG.USER_PASSWORD') ||
        this.configService.get<string>('USER_PASSWORD') ||
        process.env.USER_PASSWORD ||
        adminPassword ||
        'User@123456';

      const usersToSeed: RoleSeedConfig[] = [];

      if (adminEmail && adminPassword) {
        usersToSeed.push({
          email: adminEmail.trim().toLowerCase(),
          password: adminPassword,
          userName: 'Super Admin',
          role: UserRole.ADMIN,
        });
      }

      usersToSeed.push({
        email: moderatorEmail.trim().toLowerCase(),
        password: moderatorPassword,
        userName: 'Moderator',
        role: UserRole.MODERATOR,
      });

      usersToSeed.push({
        email: userEmail.trim().toLowerCase(),
        password: userPassword,
        userName: 'Default User',
        role: UserRole.USER,
      });

      for (const item of usersToSeed) {
        await this.seedUser(item);
      }

      this.logger.log('Database role seeding process finished.');
    } catch (error: any) {
      this.logger.error(`Error during role seeding: ${error?.message || error}`);
    }
  }

  private async seedUser(item: RoleSeedConfig): Promise<void> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: item.email },
      });

      if (existingUser) {
        this.logger.log(
          `User with email "${item.email}" (${item.role}) already exists. Skipping.`,
        );
        return;
      }

      const hashedPassword = await bcrypt.hash(item.password, 10);

      const createdUser = await this.prisma.user.create({
        data: {
          userName: item.userName,
          email: item.email,
          password: hashedPassword,
          role: item.role,
          status: UserStatus.ACTIVE,
          isVerified: true,
        },
      });

      this.logger.log(
        `[Seeded] Created ${item.role} user: "${createdUser.email}"`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to seed ${item.role} user (${item.email}): ${error?.message || error}`,
      );
    }
  }
}

