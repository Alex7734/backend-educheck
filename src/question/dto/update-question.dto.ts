import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class UpdateQuestionDto {
    @ApiProperty({ description: 'The text of the question' })
    @IsOptional()
    questionText?: string;

    @ApiProperty({ description: 'The answer to the question' })
    @IsOptional()
    answer?: string;
} 