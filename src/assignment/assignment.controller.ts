import { Controller, Post, Body, Get, Param, Patch, Delete, UseFilters, UseInterceptors, HttpStatus, Query, UnauthorizedException } from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentService } from './assignment.service';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ValidationExceptionFilter } from '../common/filters/validation-exception.filter';
import { SerializeInterceptor } from '../common/interceptors/serialize.interceptor';
import { SuccessAction, SuccessData } from '../common/types/generics';
import { plainToInstance } from 'class-transformer';
import { GetAssignmentDto } from './dto/get-assignment.dto';
import { GetAssignmentWithAnswersDto } from './dto/get-assignment-with-answers.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('assignment')
@UseFilters(ValidationExceptionFilter)
@UseInterceptors(SerializeInterceptor)
@Controller('assignments')
export class AssignmentController {
    constructor(
        private readonly assignmentService: AssignmentService,
        private readonly configService: ConfigService
    ) { }

    @Post('course/:courseId')
    @ApiOperation({ summary: 'Create a new assignment for a course' })
    @ApiResponse({ status: 201, description: 'The assignment has been successfully created.' })
    @ApiResponse({ status: 404, description: 'Not Found, course not found.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    async create(
        @Param('courseId') courseId: string,
        @Body() createAssignmentDto: CreateAssignmentDto
    ): Promise<SuccessData<GetAssignmentWithAnswersDto>> {
        const assignment = await this.assignmentService.create({
            ...createAssignmentDto,
            courseId
        });
        return {
            statusCode: HttpStatus.CREATED,
            data: plainToInstance(GetAssignmentWithAnswersDto, assignment)
        };
    }

    @Get('course/:courseId')
    @ApiOperation({ summary: 'Get assignment by course ID' })
    @ApiResponse({ status: 200, description: 'The assignment has been successfully retrieved.' })
    @ApiResponse({ status: 404, description: 'Not Found.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid admin secret.' })
    @ApiQuery({ name: 'adminSecret', required: false, description: 'Optional admin secret to view answers' })
    async getByCourseId(
        @Param('courseId') courseId: string,
        @Query('adminSecret') adminSecret?: string
    ): Promise<SuccessData<GetAssignmentDto | GetAssignmentWithAnswersDto>> {
        const assignment = await this.assignmentService.findByCourseId(courseId);

        if (adminSecret) {
            const configuredSecret = this.configService.get<string>('app.adminSecret');
            if (adminSecret !== configuredSecret) {
                throw new UnauthorizedException('Invalid admin secret');
            }
            return {
                statusCode: HttpStatus.OK,
                data: plainToInstance(GetAssignmentWithAnswersDto, assignment)
            };
        }

        return {
            statusCode: HttpStatus.OK,
            data: plainToInstance(GetAssignmentDto, assignment)
        };
    }

    @Patch('course/:courseId')
    @ApiOperation({ summary: 'Update assignment by course ID' })
    @ApiResponse({ status: 200, description: 'The assignment has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Not Found.' })
    async update(
        @Param('courseId') courseId: string,
        @Body() updateAssignmentDto: UpdateAssignmentDto
    ): Promise<SuccessData<GetAssignmentWithAnswersDto>> {
        const assignment = await this.assignmentService.updateByCourseId(courseId, updateAssignmentDto);
        return {
            statusCode: HttpStatus.OK,
            data: plainToInstance(GetAssignmentWithAnswersDto, assignment)
        };
    }

    @Delete('course/:courseId')
    @ApiOperation({ summary: 'Delete assignment by course ID' })
    @ApiResponse({ status: 200, description: 'The assignment has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Not Found.' })
    async remove(@Param('courseId') courseId: string): Promise<SuccessAction> {
        await this.assignmentService.removeByCourseId(courseId);
        return { statusCode: HttpStatus.OK, message: 'Assignment deleted successfully.' };
    }
} 