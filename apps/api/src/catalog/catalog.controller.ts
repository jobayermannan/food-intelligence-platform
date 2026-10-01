import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthedRequest } from "../common/principal";
import { CatalogService } from "./catalog.service";
import {
  CategoryDto,
  SupplierDto,
  UpdateSupplierDto,
  ProductDto,
  UpdateProductDto,
} from "./catalog.dto";

@ApiBearerAuth()
@ApiTags("catalog")
@Controller("api/v1/businesses/:businessId")
export class CatalogController {
  constructor(private readonly service: CatalogService) {}
  @Post("categories") addCategory(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: CategoryDto,
  ) {
    return this.service.createCategory(r.principal.userId, b, d);
  }
  @Get("categories") listCategories(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
  ) {
    return this.service.categories(r.principal.userId, b);
  }
  @Post("suppliers") addSupplier(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: SupplierDto,
  ) {
    return this.service.createSupplier(r.principal.userId, b, d);
  }
  @Get("suppliers") listSuppliers(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
  ) {
    return this.service.suppliers(r.principal.userId, b);
  }
  @Get("suppliers/:id") supplier(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Param("id") id: string,
  ) {
    return this.service.supplier(r.principal.userId, b, id);
  }
  @Patch("suppliers/:id") updateSupplier(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Param("id") id: string,
    @Body() d: UpdateSupplierDto,
  ) {
    return this.service.updateSupplier(r.principal.userId, b, id, d);
  }
  @Post("products") addProduct(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: ProductDto,
  ) {
    return this.service.createProduct(r.principal.userId, b, d);
  }
  @Get("products") listProducts(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
  ) {
    return this.service.products(r.principal.userId, b);
  }
  @Get("products/:id") product(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Param("id") id: string,
  ) {
    return this.service.product(r.principal.userId, b, id);
  }
  @Patch("products/:id") updateProduct(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Param("id") id: string,
    @Body() d: UpdateProductDto,
  ) {
    return this.service.updateProduct(r.principal.userId, b, id, d);
  }
}
