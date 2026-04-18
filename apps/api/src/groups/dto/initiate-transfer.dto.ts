import { IsString } from 'class-validator';

export class InitiateTransferDto {
  @IsString()
  toUserId!: string;
}
