import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: "L'adresse email saisie est invalide." })
  @IsNotEmpty({ message: "L'adresse email est obligatoire." })
  email?: string;

  @IsString({ message: 'Le code doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le code de validation est obligatoire.' })
  @Length(6, 6, { message: 'Le code doit comporter exactement 6 chiffres.' })
  @Matches(/^\d{6}$/, {
    message: 'Le code doit contenir uniquement des chiffres.',
  })
  code?: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire.' })
  @Length(8, 20, {
    message: 'Le mot de passe doit contenir entre 8 et 20 caractères.',
  })
  @Matches(/((?=.*\d)|(?=.*\W+))(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre ou caractère spécial.',
  })
  newPassword?: string;
}
