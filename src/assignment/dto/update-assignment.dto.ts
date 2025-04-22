import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateQuestionDto } from '../../question/dto/update-question.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateAssignmentDto {
    @ApiProperty({ description: 'The questions that make up the assignment' })
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateQuestionDto)
    questions?: UpdateQuestionDto[];
} 