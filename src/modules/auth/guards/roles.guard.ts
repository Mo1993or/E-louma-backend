/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucun rôle n'est spécifié sur la route, l'accès est autorisé par défaut
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException(
        'Accès refusé : Profil utilisateur non identifié',
      );
    }

    const userRole = String(user.role).toUpperCase();
    const hasRole = requiredRoles.some(
      (role) => String(role).toUpperCase() === userRole,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        "Accès refusé : Vous n'avez pas les privilèges requis",
      );
    }

    return true;
  }
}
