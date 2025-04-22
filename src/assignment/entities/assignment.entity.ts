import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Question } from '../../question/entities/question.entity';

@Entity()
export class Assignment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => Course, course => course.assignment, { onDelete: 'CASCADE' })
    @JoinColumn()
    course: Course;

    @OneToMany(() => Question, question => question.assignment, { onDelete: 'CASCADE' })
    questions: Question[];
}