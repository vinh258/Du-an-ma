import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CatalogService } from './catalog.service';
import { FacultyDto, SubjectDto, UpdateFacultyDto, UpdateSubjectDto } from './dto/catalog.dto';

@ApiTags('Catalog')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('faculties') faculties() { return this.catalog.listFaculties(); }
  @Get('faculties/:id/subjects') facultySubjects(@Param('id', ParseIntPipe) id: number) { return this.catalog.listSubjects(id); }
  @Get('subjects') subjects(@Query('facultyId') facultyId?: string) { return this.catalog.listSubjects(facultyId ? +facultyId : undefined); }
  @Get('tags') tags(@Query('q') q?: string) { return this.catalog.searchTags(q); }

  @Post('faculties') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  createFaculty(@Body() dto: FacultyDto, @CurrentUser('id') uid: number) { return this.catalog.createFaculty(dto, uid); }
  @Patch('faculties/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  updateFaculty(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFacultyDto, @CurrentUser('id') uid: number) { return this.catalog.updateFaculty(id, dto, uid); }
  @Delete('faculties/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  deleteFaculty(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) { return this.catalog.deleteFaculty(id, uid); }

  @Post('subjects') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  createSubject(@Body() dto: SubjectDto, @CurrentUser('id') uid: number) { return this.catalog.createSubject(dto, uid); }
  @Patch('subjects/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  updateSubject(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubjectDto, @CurrentUser('id') uid: number) { return this.catalog.updateSubject(id, dto, uid); }
  @Delete('subjects/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  deleteSubject(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) { return this.catalog.deleteSubject(id, uid); }
}
