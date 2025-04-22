import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class QuestionWithoutAnswerDto {
    @Expose()
    @ApiProperty({ description: 'The ID of the question' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'The text of the question' })
    questionText: string;
} 