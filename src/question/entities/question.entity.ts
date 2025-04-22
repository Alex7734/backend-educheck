import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Assignment } from '../../assignment/entities/assignment.entity';

@Entity()
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    questionText: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    answer: string;

    @ManyToOne(() => Assignment, assignment => assignment.questions, { onDelete: 'CASCADE' })
    assignment: Assignment;
} 