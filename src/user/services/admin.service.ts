import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAdminDto } from '../dto/admin/create-admin.dto';
import { Admin } from '../entities/admin.entity';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * The admin service does not support updates and also does not keep track of logged-in state.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async createAdmin(createAdminDto: CreateAdminDto): Promise<Admin> {
    const existingAdmin = await this.findByEmail(createAdminDto.email);
    if (existingAdmin) {
      throw new BadRequestException(`Admin with email ${createAdminDto.email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);
    const admin = this.adminRepository.create({
      ...createAdminDto,
      password: hashedPassword,
      id: uuidv4(),
    });
    return this.adminRepository.save(admin);
  }

  async findAllAdmin(): Promise<Admin[]> {
    return this.adminRepository.find();
  }

  async viewAdmin(id: string): Promise<Admin | null> {
    const admin = await this.adminRepository.findOneBy({ id: id.toString() });
    if (!admin) {
      return null;
    }
    return admin;
  }

  async removeAdmin(id: string): Promise<void> {
    const admin = await this.adminRepository.findOneBy({ id: id.toString() });
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    await this.adminRepository.delete(id);
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOneBy({ email });
  }
}
