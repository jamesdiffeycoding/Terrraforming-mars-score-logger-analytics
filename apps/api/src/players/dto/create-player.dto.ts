import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @IsOptional()
  @IsBoolean()
  isGuest?: boolean;
}
