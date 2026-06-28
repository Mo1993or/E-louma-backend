/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Put,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { ProductsService } from '../../services/products/products.service';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateProductDto } from '../../dto/create-product.dto';
import { UpdateProductDto } from '../../dto/update-product.dto';

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
      const uploadResults = await Promise.all(
        files.map((file) => this.cloudinaryService.uploadImage(file)),
      );
      uploadResults.forEach((result) => {
        if (result && 'secure_url' in result) imageUrls.push(result.secure_url);
      });
    }
    const sellerId = new Types.ObjectId(req.user.sub);
    return this.productsService.addProduct(
      createProductDto,
      imageUrls,
      sellerId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put(':productId')
  @UseInterceptors(FilesInterceptor('images', 5))
  async updateProduct(
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: any,
  ) {
    const newImageUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadResults = await Promise.all(
        files.map((file) => this.cloudinaryService.uploadImage(file)),
      );
      uploadResults.forEach((result) => {
        if (result && 'secure_url' in result)
          newImageUrls.push(result.secure_url);
      });
    }
    return this.productsService.updateProduct(
      productId,
      req.user.sub,
      updateProductDto,
      newImageUrls.length > 0 ? newImageUrls : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':productId')
  async deleteProduct(
    @Param('productId') productId: string,
    @Request() req: any,
  ) {
    return this.productsService.deleteProduct(productId, req.user.sub);
  }

  @Get('search')
  async searchProducts(
    @Query('q') query: string,
    @Query('category') categoryId?: string,
  ) {
    return this.productsService.searchProducts(query, categoryId);
  }

  @Get('category/:category')
  async getProductByCategory(@Param('category') categoryId: string) {
    return this.productsService.getProductsByCategoryId(categoryId);
  }

  @Get('index')
  async findAllProductAvalaible(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getAllProduct(
      cursor,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProductsByOwner(@Request() req: any) {
    return this.productsService.getAllProductsOwer(req.user.sub);
  }

  @Get('show/:productId')
  async show(@Param('productId') productId: string) {
    return this.productsService.findProductById(productId);
  }
}
