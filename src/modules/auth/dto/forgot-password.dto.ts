import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: "L'adresse email saisie est invalide." })
  @IsNotEmpty({ message: "L'adresse email est obligatoire." })
  email!: string;
}
