import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Plan, PlanDocument } from './schemas/plans.schema';
import { Model } from 'mongoose';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Types } from 'mongoose';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
  ) {}

  async create(createPlanDto: CreatePlanDto): Promise<PlanDocument> {
    const planNameUpperCase = createPlanDto.name.toUpperCase();
    const existingPlan = await this.planModel.findOne({
      name: planNameUpperCase,
    });
    if (existingPlan) {
      throw new ConflictException(
        `Un plan avec le nom '${planNameUpperCase}' existe déjà.`,
      );
    }
    const plan = new this.planModel({
      ...createPlanDto,
      name: planNameUpperCase,
    });
    return plan.save();
  }

  async findAll(): Promise<PlanDocument[]> {
    return this.planModel.find().exec();
  }
  async findAllActive(): Promise<PlanDocument[]> {
    return this.planModel.find({ isActive: true }).exec();
  }

  async findByName(name: string): Promise<PlanDocument> {
    const plan = await this.planModel.findOne({ name, isActive: true });
    if (!plan) {
      throw new NotFoundException(`Plan '${name}' introuvable ou inactif.`);
    }
    return plan;
  }

  async update(
    id: string,
    updatePlanDto: UpdatePlanDto,
  ): Promise<PlanDocument> {
    const updatedPlan = await this.planModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      updatePlanDto,
      { new: true },
    );

    if (!updatedPlan) {
      throw new NotFoundException(`Plan introuvable.`);
    }

    return updatedPlan;
  }

  async deactivate(name: string): Promise<PlanDocument> {
    return this.update(name, { isActive: false });
  }
}
