import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionService {
    constructor(
        @InjectRepository(Question)
        private readonly questionRepository: Repository<Question>,
    ) { }

    create(createQuestionDto: CreateQuestionDto) {
        const question = this.questionRepository.create(createQuestionDto);
        return this.questionRepository.save(question);
    }

    findOne(id: string) {
        if (!this.questionRepository.findOne({ where: { id } })) {
            throw new NotFoundException(`Question with id ${id} not found`);
        }

        return this.questionRepository.findOne({ where: { id } });
    }

    update(id: string, updateQuestionDto: UpdateQuestionDto) {
        if (!this.findOne(id)) {
            throw new NotFoundException(`Question with id ${id} not found`);
        }

        return this.questionRepository.update(id, updateQuestionDto);
    }

    remove(id: string) {
        return this.questionRepository.delete(id);
    }
} 