/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Cette méthode empêche le guard de lever une erreur 401 en cas d'absence de token
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      return null; // Retourne null au lieu de lever une exception
    }
    return user;
  }
}
