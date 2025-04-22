import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../services/user.service';
import { AdminService } from '../services/admin.service';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { User } from '../entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetUserDto } from '../dto/user/get-user.dto';
import { plainToInstance } from 'class-transformer';
import { Admin } from '../entities/admin.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { GetAdminDto } from '../dto/admin/get-admin.dto';
import { UserType } from '../../common/types/users';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockQueryBuilder = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 1 }),
};

const mockDefaultRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockUserRepository = {
  ...mockDefaultRepository,
};

const mockAdminRepository = {
  ...mockDefaultRepository,
};

const mockRefreshTokenRepository = {
  ...mockDefaultRepository,
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('admin-secret'),
};

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    createUser: jest.fn(),
    findAllUser: jest.fn(),
    viewUser: jest.fn(),
    updateUser: jest.fn(),
    removeUser: jest.fn(),
    updateEnrollmentCount: jest.fn(),
  };

  const mockAdminService = {
    findAllAdmin: jest.fn(),
    viewAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AdminService, useValue: mockAdminService },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Admin),
          useValue: mockAdminRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const createUserDto: CreateUserDto = { name: 'John Doe', email: 'john@example.com', password: 'password', age: 30 };
    const user = { id: '1', ...createUserDto, numberOfEnrolledCourses: 0 };
    mockUserService.createUser.mockResolvedValue(user);

    const result = await controller.create(createUserDto);
    expect(result).toEqual(plainToInstance(GetUserDto, user));
    expect(mockUserService.createUser).toHaveBeenCalledWith(createUserDto);
  });

  it('should find all users', async () => {
    const users = [{ id: '1', name: 'John Doe', email: 'john@example.com', age: 30, numberOfEnrolledCourses: 0 }];
    const admins = [{ id: '2', name: 'Admin User', email: 'admin@example.com', age: 40 }];
    mockUserService.findAllUser.mockResolvedValue(users);
    mockAdminService.findAllAdmin.mockResolvedValue(admins);

    const result = await controller.findAll();
    expect(result).toEqual([
      ...users.map(user => plainToInstance(GetUserDto, user)),
      ...admins.map(admin => plainToInstance(GetAdminDto, admin)),
    ]);
  });

  it('should find a user by id', async () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com', age: 30, numberOfEnrolledCourses: 0 };
    mockUserService.viewUser.mockResolvedValue(user);

    const result = await controller.findOne('1');
    expect(result).toEqual(plainToInstance(GetUserDto, user));
  });

  it('should update a user by id', async () => {
    const updateUserDto: UpdateUserDto = { name: 'John Doe', age: 31 };
    const updatedUser = { id: '1', ...updateUserDto, numberOfEnrolledCourses: 0 };
    mockUserService.updateUser.mockResolvedValue(updatedUser);

    const result = await controller.update('1', updateUserDto);
    expect(result).toEqual(plainToInstance(GetUserDto, updatedUser));
  });

  it('should remove a user by id', async () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com', age: 30, numberOfEnrolledCourses: 0 };
    mockUserService.viewUser.mockResolvedValue(user);
    mockUserService.removeUser.mockResolvedValue(undefined);

    await controller.remove('1');
    expect(mockUserService.removeUser).toHaveBeenCalledWith('1');
  });

  it('should throw NotFoundException when user not found', async () => {
    mockUserService.viewUser.mockResolvedValue(null);

    await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException for invalid user type', async () => {
    await expect(controller.findAll('invalid-type' as UserType)).rejects.toThrow(BadRequestException);
  });

  it('should handle user not found when updating enrollment count', async () => {
    const mockFailedQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    mockUserRepository.createQueryBuilder.mockReturnValue(mockFailedQueryBuilder);
    mockUserService.updateEnrollmentCount.mockRejectedValue(new Error('User not found'));

    const updatePromise = userService.updateEnrollmentCount('non-existent-id', 1);

    await expect(updatePromise).rejects.toThrow('User not found');
  });

  it('should update enrollment count successfully', async () => {
    mockUserService.updateEnrollmentCount.mockResolvedValue(undefined);

    await userService.updateEnrollmentCount('1', 1);

    expect(mockUserService.updateEnrollmentCount).toHaveBeenCalledWith('1', 1);
  });

  it('should handle User instance in findOne', async () => {
    const user = new User();
    user.id = '1';
    user.name = 'John Doe';
    user.email = 'john@example.com';
    user.age = 30;
    user.numberOfEnrolledCourses = 0;

    mockUserService.viewUser.mockResolvedValue(user);

    const result = await controller.findOne('1');

    expect(result).toEqual(plainToInstance(GetUserDto, user));
    expect(mockUserService.viewUser).toHaveBeenCalledWith('1');
  });

  it('should find admin by id when user is not found', async () => {
    mockUserService.viewUser.mockRejectedValue(new NotFoundException());
    const admin = { id: '1', name: 'Admin User', email: 'admin@example.com', age: 40 };
    mockAdminService.viewAdmin.mockResolvedValue(admin);

    const result = await controller.findOne('1');
    expect(result).toEqual(plainToInstance(GetAdminDto, admin));
    expect(mockUserService.viewUser).toHaveBeenCalledWith('1');
    expect(mockAdminService.viewAdmin).toHaveBeenCalledWith('1');
  });

  it('should throw NotFoundException when neither user nor admin is found', async () => {
    mockUserService.viewUser.mockRejectedValue(new NotFoundException());
    mockAdminService.viewAdmin.mockResolvedValue(null);

    await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    expect(mockUserService.viewUser).toHaveBeenCalledWith('non-existent-id');
    expect(mockAdminService.viewAdmin).toHaveBeenCalledWith('non-existent-id');
  });

  it('should handle array response from admin view', async () => {
    mockUserService.viewUser.mockRejectedValue(new NotFoundException());
    const admin = [{ id: '1', name: 'Admin User', email: 'admin@example.com', age: 40 }];
    mockAdminService.viewAdmin.mockResolvedValue(admin);

    const result = await controller.findOne('1');
    expect(result).toEqual(plainToInstance(GetAdminDto, admin[0]));
  });

  it('should throw NotFoundException when updating non-existent user', async () => {
    const updateUserDto: UpdateUserDto = { name: 'John Doe', age: 31 };
    mockUserService.updateUser.mockResolvedValue(null);

    await expect(controller.update('non-existent-id', updateUserDto))
      .rejects.toThrow(NotFoundException);
    expect(mockUserService.updateUser).toHaveBeenCalledWith('non-existent-id', updateUserDto);
  });

  it('should find all users when type is not specified', async () => {
    const users = [{ id: '1', name: 'John Doe', email: 'john@example.com', age: 30, numberOfEnrolledCourses: 0 }];
    const admins = [{ id: '2', name: 'Admin User', email: 'admin@example.com', age: 40 }];
    mockUserService.findAllUser.mockResolvedValue(users);
    mockAdminService.findAllAdmin.mockResolvedValue(admins);

    const result = await controller.findAll(undefined);
    expect(result).toEqual([
      ...users.map(user => plainToInstance(GetUserDto, user)),
      ...admins.map(admin => plainToInstance(GetAdminDto, admin))
    ]);
  });

  it('should find only users when type is USERS', async () => {
    const users = [{ id: '1', name: 'John Doe', email: 'john@example.com', age: 30, numberOfEnrolledCourses: 0 }];
    mockUserService.findAllUser.mockResolvedValue(users);

    const result = await controller.findAll(UserType.USERS);
    expect(result).toEqual(users.map(user => plainToInstance(GetUserDto, user)));
    expect(mockAdminService.findAllAdmin).not.toHaveBeenCalled();
  });

  it('should find only admins when type is ADMINS', async () => {
    const admins = [{ id: '2', name: 'Admin User', email: 'admin@example.com', age: 40 }];
    mockAdminService.findAllAdmin.mockResolvedValue(admins);

    const result = await controller.findAll(UserType.ADMINS);
    expect(result).toEqual(admins.map(admin => plainToInstance(GetAdminDto, admin)));
    expect(mockUserService.findAllUser).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when removing non-existent user', async () => {
    mockUserService.viewUser.mockResolvedValue(null);

    await expect(controller.remove('non-existent-id'))
      .rejects.toThrow(NotFoundException);
    expect(mockUserService.removeUser).not.toHaveBeenCalled();
  });
});