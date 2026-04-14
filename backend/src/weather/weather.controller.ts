import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('api/weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get()
  async getWeather(@Query('stationId') stationId?: string) {
    if (!stationId) {
      throw new BadRequestException('stationId is required');
    }
    if (!/^[A-Z0-9]{6,7}$/i.test(stationId)) {
      throw new BadRequestException('stationId format invalid');
    }
    return this.weather.get30DayWeather(stationId);
  }
}
