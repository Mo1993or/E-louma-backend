import { Module } from '@nestjs/common';
import { CloudinaryProvider } from 'src/core/provider/cloudinary.provider';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';

@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryProvider, CloudinaryService],
})
export class CloudinaryModule {}
