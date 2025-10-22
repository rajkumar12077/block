import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    
    // Get user role from various possible property names
    const userRole = user?.role || user?.userRole || user?.userType;
    
    console.log('=== Roles Guard Debug ===');
    console.log('Required roles:', requiredRoles);
    console.log('User object:', user);
    console.log('User role found:', userRole);
    console.log('Role check result:', requiredRoles.includes(userRole));
    
    return requiredRoles.includes(userRole);
  }
}
