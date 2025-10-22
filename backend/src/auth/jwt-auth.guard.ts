import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('No token provided');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, 'secretKey') as any;
      
      // Ensure role is properly set from any of the possible fields
      const userRole = decoded.role || decoded.userRole || decoded.userType;
      
      // Create user object with consistent fields
      req.user = {
        userId: decoded.sub,
        role: userRole,
        email: decoded.email,
        name: decoded.name,
        ...decoded
      };
      
      console.log('=== JWT Auth Guard Debug ===');
      console.log('Decoded token:', decoded);
      console.log('Extracted role:', userRole);
      console.log('Final user object:', req.user);
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
