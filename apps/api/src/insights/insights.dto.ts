import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
export class RecommendationDto {
  @IsUUID() locationId!: string;
  @IsUUID() productId!: string;
}
export class ApproveDiscountDto {
  @IsUUID() productId!: string;
  @IsOptional() @IsUUID() batchId?: string;
  @IsString() @Matches(/^\d+(\.\d{1,3})?$/) percent!: string;
  @IsISO8601() validFrom!: string;
  @IsISO8601() validUntil!: string;
  @IsString() @MinLength(4) @MaxLength(500) explanation!: string;
}
