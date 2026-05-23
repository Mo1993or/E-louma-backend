/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { ProductsService } from '../../services/products/products.service';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateProductDto } from '../../dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  @UseGuards(JwtAuthGuard)
  @Post('add')
  @UseInterceptors(FilesInterceptor('images', 5))
  async createProduct(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createProductDto: CreateProductDto,
    @Request() req: any,
  ) {
    const imageUrls: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        this.cloudinaryService.uploadImage(file),
      );
      const uploadResults = await Promise.all(uploadPromises);

      // Correction du typage ici en forçant l'accès sécurisé à secure_url
      uploadResults.forEach((result) => {
        if (result && 'secure_url' in result) {
          imageUrls.push(result.secure_url);
        }
      });
    }

    const userIdString = req.user.sub;
    const sellerId = new Types.ObjectId(userIdString);

    // On passe directement le DTO, le tableau d'images et l'ObjectId du vendeur au service
    return this.productsService.addProduct(
      createProductDto,
      imageUrls,
      sellerId,
    );
  }

  @Get('category/:category')
  async getProductByCategory(@Param('category') categoryId: string) {
    return this.productsService.getProductsByCategoryId(categoryId);
  }

  @Get('index')
  async findAllProductAvalaible() {
    return this.productsService.getAllProduct();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProductsByOwner(@Request() req: any)s {
    const userId = req.user.sub;
    return this.productsService.getAllProductsOwer(userId);
  }
}
