import { IsIn } from 'class-validator';

export class ResolveClaimDto {
  @IsIn(['approved', 'rejected'])
  status!: string;
}
