import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WeatherModule } from './weather/weather.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [WeatherModule, AnalysisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
