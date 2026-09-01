import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { UserStatus } from 'src/shared/enums/user-status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  /**
   * Récupère tous les utilisateurs
   */
  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').exec();
  }

  /**
   * Trouve un utilisateur par son ID
   */
  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(id) })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  /**
   * Met à jour les données d'un utilisateur
   */
  async changeStatus(id: string, status: UserStatus): Promise<UserDocument> {
    const userStatus = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          status,
        },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!userStatus) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return userStatus;
  }
}
