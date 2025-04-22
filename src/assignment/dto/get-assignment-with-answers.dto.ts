import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { QuestionWithAnswerDto } from "../../question/dto/question-with-answer.dto";

export class GetAssignmentWithAnswersDto {
    @Expose()
    @ApiProperty({ description: 'The ID of the assignment' })
    id: string;

    @Expose()
    @Type(() => QuestionWithAnswerDto)
    @ApiProperty({ description: 'The questions with answers', type: [QuestionWithAnswerDto] })
    questions: QuestionWithAnswerDto[];
} 