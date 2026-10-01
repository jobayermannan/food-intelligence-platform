import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateBusinessDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsString() @MinLength(3) @MaxLength(64) timezone!: string;
  @IsString() @MinLength(3) @MaxLength(3) currency!: string;
  @IsNumber() @Min(0) @Max(1) defaultTaxRate!: number;
  @IsString() @MinLength(8) @MaxLength(120) requestKey!: string;
}
export class CreateLocationDto {
  @IsString() @MinLength(1) @MaxLength(32) code!: string;
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
}
export class UpdateLocationDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsIn(["active", "inactive"]) status?: "active" | "inactive";
}
export class MemberDto {
  @IsUUID() userId!: string;
  @IsIn(["OWNER", "ADMIN", "STAFF", "VIEWER"]) role!:
    "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
  @IsOptional() @IsString() password?: string;
}
export class ChangeRoleDto {
  @IsIn(["OWNER", "ADMIN", "STAFF", "VIEWER"]) role!:
    "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
  @IsOptional() @IsString() password?: string;
}
export class LocationGrantsDto {
  @IsArray() @ArrayUnique() @IsUUID("4", { each: true }) locationIds!: string[];
}
export class ExpirySettingsDto {
  @IsInt() @Min(1) @Max(10000) criticalHours!: number;
  @IsInt() @Min(2) @Max(10000) warningHours!: number;
}
export class ReauthenticateDto {
  @IsOptional() @IsString() password?: string;
}
