import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { AuthExceptionFilter } from './auth/auth.exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS with specific configuration
    app.enableCors({
      origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });
    
    // Increase payload size limit to 10MB
    app.use(bodyParser.json({limit: '10mb'}));
    app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
    
    // Register the global exception filter for better error handling
    app.useGlobalFilters(new AuthExceptionFilter());
    
    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log('📋 Available routes:');
    logger.log('  - GET /user/balance');
    logger.log('  - GET /insurance/dashboard-data');
    logger.log('  - GET /insurance/policies');
    logger.log('  - GET /accounts/transactions');
    logger.log('  - POST /accounts/my-insurance-fund');
    
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}
bootstrap();
