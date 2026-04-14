import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { StationService } from './station.service';

@Controller('api/station')
export class StationController {
  constructor(private readonly station: StationService) {}

  @Get('list')
  list() {
    return { stations: this.station.listStations() };
  }

  @Post('match')
  async match(@Body() body: { input?: string }) {
    const input = body?.input?.trim();
    if (!input) throw new BadRequestException('input is required');
    return this.station.match(input);
  }
}
