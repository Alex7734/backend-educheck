import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from '../../dto/user/create-user.dto';
import { UpdateUserDto } from '../../dto/user/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { GetUserDto } from '../../dto/user/get-user.dto';
import { plainToInstance } from 'class-transformer';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;

  const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password',
      name: 'Test User',
      age: 25,
    };

    it('should create a new user successfully', async () => {
      const expectedUser = { id: 'mocked-uuid', ...createUserDto, password: 'hashedPassword' };
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(expectedUser);
      mockUserRepository.save.mockResolvedValue(expectedUser);

      const result = await service.createUser(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(expectedUser);
      expect(mockUserRepository.save).toHaveBeenCalledWith(expectedUser);
    });

    it('should throw ConflictException if user with email already exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({ id: 'existing-id' });

      await expect(service.createUser(createUserDto))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('findAllUser', () => {
    it('should return all users', async () => {
      const expectedUsers = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];
      mockUserRepository.find.mockResolvedValue(expectedUsers);

      const result = await service.findAllUser();

      expect(result).toEqual(expectedUsers);
      expect(mockUserRepository.find).toHaveBeenCalled();
    });
  });

  describe('viewUser', () => {
    it('should return user when found', async () => {
      const expectedUser = { id: '1', name: 'Test User' };
      mockUserRepository.findOneBy.mockResolvedValue(expectedUser);

      const result = await service.viewUser('1');

      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await service.viewUser('1');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateUserDto = { name: 'Updated Name' };

    it('should update user successfully', async () => {
      const existingUser = { id: '1', name: 'Original Name' };
      const updatedUser = { id: '1', name: 'Updated Name' };

      mockUserRepository.findOneBy.mockResolvedValueOnce(existingUser);
      mockUserRepository.findOneBy.mockResolvedValueOnce(updatedUser);

      const result = await service.updateUser('1', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', updateUserDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.updateUser('1', updateUserDto))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('removeUser', () => {
    it('should remove user successfully', async () => {
      const existingUser = { id: '1', name: 'Test User' };
      mockUserRepository.findOneBy.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockResolvedValue({ affected: 1 });

      await service.removeUser('1');

      expect(mockUserRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.removeUser('1'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const expectedUser = { id: '1', email: 'test@example.com' };
      mockUserRepository.findOneBy.mockResolvedValue(expectedUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should return null when user not found by email', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('logged in users management', () => {
    it('should add and remove logged in users', () => {
      service.addLoggedInUser('1');
      expect(service.getNumberOfLoggedInUsers()).toBe(1);

      service.removeLoggedInUser('1');
      expect(service.getNumberOfLoggedInUsers()).toBe(0);
    });

    it('should get logged in users', async () => {
      service.addLoggedInUser('1');
      service.addLoggedInUser('2');

      const mockUsers = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];

      mockUserRepository.findByIds.mockResolvedValue(mockUsers);

      const result = await service.getLoggedInUsers();

      expect(result).toEqual(mockUsers.map(user => plainToInstance(GetUserDto, user)));
      expect(mockUserRepository.findByIds).toHaveBeenCalledWith(['1', '2']);
    });
  });

  describe('refresh token management', () => {
    it('should save refresh token', async () => {
      const token = 'refresh-token';
      const userId = '1';
      const mockRefreshToken = { token, user: { id: userId } };

      mockRefreshTokenRepository.create.mockReturnValue(mockRefreshToken);
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

      await service.saveRefreshToken(userId, token);

      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(mockRefreshToken);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should invalidate refresh token when token exists', async () => {
      const token = 'refresh-token';
      const mockRefreshToken = { token };

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRefreshTokenRepository.remove.mockResolvedValue(mockRefreshToken);

      await service.invalidateRefreshToken(token);

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({ where: { token } });
      expect(mockRefreshTokenRepository.remove).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should handle invalidating non-existent refresh token', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await service.invalidateRefreshToken('non-existent-token');

      expect(mockRefreshTokenRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user when found by id', async () => {
      const expectedUser = { id: '1', name: 'Test User' };
      mockUserRepository.findOneBy.mockResolvedValue(expectedUser);

      const result = await service.findById('1');

      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
    });

    it('should return null when user not found by id', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findById('1');

      expect(result).toBeNull();
    });
  });

  describe('updateEnrollmentCount', () => {

    it('should update enrollment count successfully', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      await service.updateEnrollmentCount('1', 1);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(User);

      const setCall = mockQueryBuilder.set.mock.calls[0][0];
      const updateFunction = setCall.numberOfEnrolledCourses;

      expect(typeof updateFunction).toBe('function');
      expect(updateFunction()).toBe('"numberOfEnrolledCourses" + 1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: '1' });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should update enrollment count with negative value', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      await service.updateEnrollmentCount('1', -1);

      const setCall = mockQueryBuilder.set.mock.calls[0][0];
      const updateFunction = setCall.numberOfEnrolledCourses;

      expect(updateFunction()).toBe('"numberOfEnrolledCourses" + -1');
    });

    it('should throw error when user not found during enrollment count update', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      await expect(service.updateEnrollmentCount('1', 1))
        .rejects
        .toThrow('User not found');
    });
  });
});