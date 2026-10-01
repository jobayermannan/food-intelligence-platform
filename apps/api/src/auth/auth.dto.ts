import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";
export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(12) @MaxLength(200) password!: string;
  @IsString() @MinLength(1) @MaxLength(120) displayName!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
export class TokenDto {
  @IsString() token!: string;
}
export class ForgotDto {
  @IsEmail() email!: string;
}
export class ResetDto extends TokenDto {
  @IsString() @MinLength(12) @MaxLength(200) password!: string;
}
