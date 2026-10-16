import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DemoController } from "./demo.controller";
import { DemoService } from "./demo.service";
@Module({
  imports: [AuthModule],
  providers: [DemoService],
  controllers: [DemoController],
  exports: [DemoService],
})
export class DemoModule {}
