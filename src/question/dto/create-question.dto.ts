import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class CreateQuestionDto {
    @ApiProperty({ description: 'The text of the question', example: 'What is the capital of France?' })
    @IsString()
    @Length(1, 255)
    questionText: string;

    @ApiProperty({ description: 'The answer to the question', example: 'Paris' })
    @IsString()
    @Length(1, 32)
    answer: string;
} 