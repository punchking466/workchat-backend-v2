// require-group-admin.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RequireGroupAdmin = () => SetMetadata('requireGroupAdmin', true);
