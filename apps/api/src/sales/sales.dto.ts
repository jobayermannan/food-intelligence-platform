import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
export class SaleLineDto {
  @IsUUID() productId!: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity!: string;
  @IsOptional() @IsUUID() discountId?: string;
}
export class CreateSaleDto {
  @IsUUID() locationId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines!: SaleLineDto[];
  @IsString() @MinLength(8) @MaxLength(120) requestKey!: string;
}
export class ReturnLineDto {
  @IsUUID() allocationId!: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity!: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) restocked!: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) disposed!: string;
}
export class CreateReturnDto {
  @IsString() @MinLength(4) @MaxLength(500) reason!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReturnLineDto)
  lines!: ReturnLineDto[];
  @IsString() @MinLength(8) @MaxLength(120) requestKey!: string;
}
