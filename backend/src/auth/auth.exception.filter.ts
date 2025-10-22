import { ExceptionFilter, Catch, ArgumentsHost, HttpException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';

// Extended Express Request type to include user property
interface RequestWithUser extends Request {
  user?: any;
}

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    // Add detailed debugging for auth-related exceptions
    if (exception instanceof ForbiddenException || exception instanceof UnauthorizedException) {
      console.error('=== Auth Exception Details ===');
      console.error('Request URL:', request.url);
      console.error('Request method:', request.method);
      console.error('Request headers:', request.headers);
      console.error('Request user:', request.user);
      console.error('Exception status:', status);
      console.error('Exception response:', exceptionResponse);
      
      // For Forbidden exceptions, provide more details about role issues
      if (exception instanceof ForbiddenException) {
        // Check if we have metadata on required roles
        try {
          const routeHandler = request.route?.stack?.[0]?.handle;
          if (routeHandler) {
            const requiredRoles = Reflect.getMetadata('roles', routeHandler);
            if (requiredRoles) {
              console.error('Required roles for this route:', requiredRoles);
              console.error('User role:', request.user?.role);
            }
          }
        } catch (error) {
          console.error('Error accessing route metadata:', error);
        }
      }
    }
    
    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: exception.message,
        details: typeof exceptionResponse === 'object' ? exceptionResponse : { error: exceptionResponse },
      });
  }
}