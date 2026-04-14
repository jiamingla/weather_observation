import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller('api/analyze')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Post()
  async analyze(@Body() body: { stationId?: string }) {
    const stationId = body?.stationId?.trim();
    if (!stationId) {
      throw new BadRequestException('stationId is required');
    }
    if (!/^[A-Z0-9]{6,7}$/i.test(stationId)) {
      throw new BadRequestException('stationId format invalid');
    }
    return this.analysis.analyze(stationId);
  }
}
