import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";
export class ReceiveDto {
  @IsUUID() locationId!: string;
  @IsUUID() productId!: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity!: string;
  @IsIn(["piece", "kg", "gram", "litre", "ml", "package"]) unit!: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) acquisitionTotal!: string;
  @IsIn(["known", "unknown", "nonperishable"]) expiryStatus!:
    "known" | "unknown" | "nonperishable";
  @IsOptional() @IsString() expiresOn?: string;
  @IsOptional() @IsString() @MaxLength(120) lotReference?: string;
  @IsString() @MinLength(8) @MaxLength(120) operationKey!: string;
}
export class TransferDto {
  @IsUUID() sourceLocationId!: string;
  @IsUUID() destinationLocationId!: string;
  @IsUUID() batchId!: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity!: string;
  @IsString() @MinLength(8) @MaxLength(120) operationKey!: string;
}
export class WasteDto {
  @IsUUID() locationId!: string;
  @IsUUID() batchId!: string;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity!: string;
  @IsIn([
    "expired",
    "spoiled",
    "damaged",
    "overproduction",
    "preparation_waste",
    "other",
  ])
  reason!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsString() @MinLength(8) @MaxLength(120) operationKey!: string;
}
export class AdjustDto {
  @IsUUID() locationId!: string;
  @IsUUID() batchId!: string;
  @IsString() @Matches(/^-?\d+(\.\d{1,6})?$/) delta!: string;
  @IsString() @MinLength(4) @MaxLength(500) reason!: string;
  @IsString() @MinLength(8) @MaxLength(120) operationKey!: string;
}
