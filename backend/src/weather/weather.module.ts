import { Module } from '@nestjs/common';
import { CwaClient } from './cwa.client';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  controllers: [WeatherController],
  providers: [CwaClient, WeatherService],
})
export class WeatherModule {}
