import {
  IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsInt, IsBoolean, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GamePlayerDto {
  @IsString()
  playerId!: string;

  @IsOptional()
  @IsString()
  corporationId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  placement?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  terraformRating?: number;

  @IsOptional()
  @IsBoolean()
  isWinner?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateGameDto {
  @IsString()
  boardId!: string;

  @IsDateString()
  playedAt!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expansionSetIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GamePlayerDto)
  players!: GamePlayerDto[];
}
