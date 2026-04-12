import {
  IsString, IsDateString, IsOptional, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GamePlayerDto } from './create-game.dto';

export class UpdateGameDto {
  @IsOptional()
  @IsString()
  boardId?: string;

  @IsOptional()
  @IsDateString()
  playedAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expansionSetIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GamePlayerDto)
  players?: GamePlayerDto[];
}
