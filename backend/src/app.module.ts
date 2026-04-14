import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WeatherModule } from './weather/weather.module';
import { AnalysisModule } from './analysis/analysis.module';
import { StationModule } from './station/station.module';

@Module({
  imports: [WeatherModule, AnalysisModule, StationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
