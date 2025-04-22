import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../entities/refresh-token.entity';
import { GetUserDto } from '../dto/user/get-user.dto';
import { plainToInstance } from 'class-transformer';
import { MoreThan } from 'typeorm';
import { UpdatePasswordDto } from '../dto/user/update-password.dto';

@Injectable()
export class UserService {
  private loggedInUsers: Set<string> = new Set();

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) { }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException(`User with email ${createUserDto.email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      id: uuidv4(),
    });
    return this.userRepository.save(user);
  }

  async findAllUser(): Promise<User[]> {
    return this.userRepository.find();
  }

  async viewUser(id: string): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ id: id.toString() });
    if (!user) {
      return null;
    }
    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    const user = await this.viewUser(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.update(id, updateUserDto);
    return this.viewUser(id);
  }

  async removeUser(id: string): Promise<void> {
    const user = await this.viewUser(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.delete(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      return null;
    }
    return user;
  }

  addLoggedInUser(userId: string): void {
    this.loggedInUsers.add(userId);
  }

  removeLoggedInUser(userId: string): void {
    this.loggedInUsers.delete(userId);
  }

  async getLoggedInUsers(): Promise<GetUserDto[]> {
    const loggedInUserIds = Array.from(this.loggedInUsers);
    const users = await this.userRepository.findByIds(loggedInUserIds);
    return users.map(user => plainToInstance(GetUserDto, user));
  }

  getNumberOfLoggedInUsers(): number {
    return this.loggedInUsers.size;
  }

  async invalidateRefreshToken(token: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({ where: { token } });
    if (refreshToken) {
      await this.refreshTokenRepository.remove(refreshToken);
    }
  }

  async saveRefreshToken(userId: string, token: string): Promise<void> {
    const refreshToken = this.refreshTokenRepository.create({ token, user: { id: userId } });
    await this.refreshTokenRepository.save(refreshToken);
  }

  async findById(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      return null;
    }
    return user;
  }

  async updateEnrollmentCount(userId: string, change: number): Promise<void> {
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        numberOfEnrolledCourses: () => `"numberOfEnrolledCourses" + ${change}`
      })
      .where('id = :id', { id: userId })
      .execute();

    if (result.affected === 0) {
      throw new Error('User not found');
    }
  }

  async saveResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.userRepository.update(userId, {
      resetToken: token,
      resetTokenExpires: expires,
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        resetToken: token,
        resetTokenExpires: MoreThan(new Date()),
      },
    });
    return user || null;
  }

  async invalidateResetToken(token: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { resetToken: token } });

    if (user) {
      user.resetToken = null;
      user.resetTokenExpires = null;
      await this.userRepository.save(user);
    }
  }

  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto): Promise<void> {
    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword });
  }
}