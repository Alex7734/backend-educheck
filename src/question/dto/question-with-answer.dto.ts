import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class QuestionWithAnswerDto {
    @Expose()
    @ApiProperty({ description: 'The ID of the question' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'The text of the question' })
    questionText: string;

    @Expose()
    @ApiProperty({ description: 'The answer to the question' })
    answer: string;
} 