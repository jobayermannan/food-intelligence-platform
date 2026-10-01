import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CategoryDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
}
export class SupplierDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
}
export class UpdateSupplierDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsIn(["active", "inactive"]) status?: "active" | "inactive";
}
export class ProductDto {
  @IsUUID() categoryId!: string;
  @IsString() @MinLength(1) @MaxLength(64) sku!: string;
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsIn(["piece", "kg", "gram", "litre", "ml", "package"]) baseUnit!: string;
  @IsOptional() @IsString() @MaxLength(120) packageDefinition?: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) sellingPrice!: string;
}
export class UpdateProductDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @Matches(/^\d+(\.\d{1,6})?$/) sellingPrice?: string;
  @IsOptional() @IsIn(["active", "inactive"]) status?: "active" | "inactive";
}
