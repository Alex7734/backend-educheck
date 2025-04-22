import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';

@Entity()
export class Enrollment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, user => user.enrollments, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Course, course => course.enrollments, { onDelete: 'CASCADE' })
    course: Course;

    @CreateDateColumn()
    enrollmentDate: Date;

    @Column({ default: false })
    completed: boolean;

    @Column({ default: false })
    testPassed: boolean;

    @Column({ type: 'timestamp', nullable: true })
    dateLastAttempt: Date;
} 