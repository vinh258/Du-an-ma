import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { PageQuery } from '../../common/pagination';
import { AdjustReputationDto, AdminUserQuery, SetRoleDto, SetStatusDto, UpdateProfileDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me') @UseGuards(JwtAuthGuard)
  me(@CurrentUser('id') id: number) { return this.users.getMe(id); }

  @Patch('me') @UseGuards(JwtAuthGuard)
  update(@CurrentUser('id') id: number, @Body() dto: UpdateProfileDto) { return this.users.updateMe(id, dto); }

  @Get('me/reputation-logs') @UseGuards(JwtAuthGuard)
  logs(@CurrentUser('id') id: number, @Query() q: PageQuery) { return this.users.getReputationLogs(id, q as AdminUserQuery); }

  @Get(':id')
  profile(@Param('id', ParseIntPipe) id: number) { return this.users.getPublicProfile(id); }
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get() list(@Query() q: AdminUserQuery) { return this.users.adminList(q); }

  @Patch(':id/role')
  role(@CurrentUser('id') adminId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: SetRoleDto) {
    return this.users.setRole(adminId, id, dto.role);
  }

  @Patch(':id/status')
  status(@CurrentUser('id') adminId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: SetStatusDto) {
    return this.users.setStatus(adminId, id, dto.status);
  }

  @Post(':id/reputation')
  reputation(@CurrentUser('id') adminId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: AdjustReputationDto) {
    return this.users.adjustReputation(adminId, id, dto);
  }
}
