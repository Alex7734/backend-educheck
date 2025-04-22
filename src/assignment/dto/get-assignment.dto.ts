import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { QuestionWithoutAnswerDto } from "../../question/dto/question-without-answer.dto";

export class GetAssignmentDto {
    @Expose()
    @ApiProperty({ description: 'The ID of the assignment' })
    id: string;

    @Expose()
    @Type(() => QuestionWithoutAnswerDto)
    @ApiProperty({ description: 'The questions that make up the assignment', type: [QuestionWithoutAnswerDto] })
    questions: QuestionWithoutAnswerDto[];
}