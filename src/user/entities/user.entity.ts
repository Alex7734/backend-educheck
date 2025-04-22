import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  name: string;

  @Column({ type: 'int', nullable: true, default: null })
  age: number | null;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'int', default: 0 })
  numberOfEnrolledCourses: number;

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user, { onDelete: 'CASCADE' })
  refreshTokens: RefreshToken[];

  @OneToMany(() => Enrollment, (enrollment: Enrollment) => enrollment.user, { onDelete: 'CASCADE' })
  enrollments: Enrollment[];

  @Column({ type: 'varchar', nullable: true, default: null })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  resetTokenExpires: Date | null;
}