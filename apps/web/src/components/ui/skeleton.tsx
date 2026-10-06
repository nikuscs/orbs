import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { TrackerChart } from './tracker-chart';
import type { TrackerBlockProps } from './tracker-chart';
import type { HTMLAttributes } from 'react';

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-accent', className)} data-slot="skeleton" {...props} />;
}

export interface TrackerChartSkeletonProps {
  className?: string
  dataPoints?: number
  mode?: 'static' | 'animated'
  interval?: number
  description?: string
}

export function TrackerChartSkeleton({
  className,
  dataPoints = 50,
  mode = 'static',
  interval = 1000,
  description = 'Loading',
  ...props
}: TrackerChartSkeletonProps) {
  const initialData = Array(dataPoints)
    .fill(0)
    .map((_, index) => ({
      key: `skeleton-${index}`,
      color: 'bg-gray-300',
    }));

  const [skeletonData, setSkeletonData] = useState<TrackerBlockProps[]>(initialData);

  useEffect(() => {
    if (mode !== 'animated') {
      return;
    }

    const timer = setInterval(() => {
      setSkeletonData((prev) => {
        return [
          ...prev.slice(1),
          {
            key: new Date().toISOString(),
            color: 'bg-gray-300',
          },
        ];
      });
    }, interval);

    return () => clearInterval(timer);
  }, [dataPoints, mode, interval]);

  return (
    <div className={cn('relative opacity-30', className)}>
      <TrackerChart data={skeletonData} {...props} hoverEffect={false} />
      <div className="absolute inset-0 flex-center px-4 py-2">
        <div className="rounded-lg bg-secondary px-2 py-1 text-xxs leading-none text-primary ring-1 ring-foreground/50">{description}</div>
      </div>
    </div>
  );
}

export { Skeleton };
