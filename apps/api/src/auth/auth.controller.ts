import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthResponse, PublicUser } from '@repo/types';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account and return a JWT' })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a JWT' })
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated user' })
  me(@CurrentUser('id') userId: string): Promise<PublicUser> {
    return this.auth.me(userId);
  }
}
