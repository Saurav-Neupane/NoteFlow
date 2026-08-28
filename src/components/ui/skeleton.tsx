import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />;
}

export { Skeleton };