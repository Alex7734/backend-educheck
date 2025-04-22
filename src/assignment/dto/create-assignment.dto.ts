import { ApiProperty } from '@nestjs/swagger';
import { CreateQuestionDto } from '../../question/dto/create-question.dto';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
    @ApiProperty({ description: 'The ID of the course to which the assignment belongs' })
    @IsString()
    courseId: string;

    @ApiProperty({
        description: 'The questions that make up the assignment',
        example: [{ questionText: 'What is the capital of France?', answer: 'Paris' }]
    })
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CreateQuestionDto)
    questions: CreateQuestionDto[];
} 