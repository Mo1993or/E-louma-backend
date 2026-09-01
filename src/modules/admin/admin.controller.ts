import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LoginDto } from '../auth/dto/login.dto';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from '../auth/services/users/users.service';
import { UserStatus } from 'src/shared/enums/user-status.enum';
import { ProductsService } from '../auth/services/products/products.service';
import { PlansService } from '../plans/plans.service';
import { CreatePlanDto } from '../plans/dto/create-plan.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UsersService,
    private readonly productService: ProductsService,
    private readonly planService: PlansService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.adminService.login(dto);
  }

  /**
   * Gestion User
   *
   */
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAllUsers() {
    return this.userService.findAll();
  }

  @Get('user/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findUserById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Get('user/change-status/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async changeUserStatus(@Param('id') id: string, userStatus: UserStatus) {
    return this.userService.changeStatus(id, userStatus);
  }

  /**
   * Gestion des Produits
   *
   */

  @Get('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAllProducts() {
    return this.productService.findAll();
  }

  @Get('product/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findProductById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Get('user/change-status/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  /**
   * Gestion des Plans d'abonnement
   *
   */
  @Post('plan/add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAllPlans() {
    return this.planService.findAll();
  }

  @Post('plan/update/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updatePlan(
    @Param('id') id: string,
    @Body() createPlanDto: CreatePlanDto,
  ) {
    return this.planService.update(id, createPlanDto);
  }
}
