/**
 * Image with Skeleton Loader
 *
 * A wrapper around Next.js Image component that displays a skeleton
 * placeholder while the image is loading.
 */

'use client';

import { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';

import { isExternalMediaUrl, isFalMediaUrl } from '@/lib/utils/media-url';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface ImageWithSkeletonProps extends Omit<ImageProps, 'onLoad'> {
  /**
   * Custom skeleton className
   */
  skeletonClassName?: string;
  /**
   * Aspect ratio for the skeleton (e.g., "4/3", "16/9", "square")
   */
  aspectRatio?: '1/1' | '4/3' | '3/4' | '16/9' | '9/16' | 'video';
  /**
   * Whether to show a fade-in animation when image loads
   */
  fadeIn?: boolean;
  /**
   * Callback when image finishes loading
   */
  onLoadComplete?: () => void;
  /**
   * Optional error handler (e.g. swap to fallback avatar). Passed through to Next Image after internal state updates.
   */
  onError?: ImageProps['onError'];
}

const aspectRatioClasses = {
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '3/4': 'aspect-[3/4]',
  '16/9': 'aspect-video',
  '9/16': 'aspect-[9/16]',
  video: 'aspect-video',
};

export function ImageWithSkeleton({
  src,
  alt,
  className,
  skeletonClassName,
  aspectRatio,
  fadeIn = true,
  onLoadComplete,
  onError,
  ...props
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const shouldBypassOptimizer =
    typeof src === 'string' && (isFalMediaUrl(src) || isExternalMediaUrl(src));
  const shouldShowDefaultErrorFallback = hasError && !onError;

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoadComplete?.();
  };

  const handleError: NonNullable<ImageProps['onError']> = (event) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(event);
  };

  // If using fill prop, wrap in relative container
  // Note: wrapper needs to fill parent container (h-full w-full)
  if (props.fill) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {/* Skeleton overlay */}
        {isLoading && (
          <Skeleton
            className={cn(
              'absolute inset-0 z-10',
              aspectRatio && aspectRatioClasses[aspectRatio],
              skeletonClassName,
            )}
          />
        )}

        {/* Backward-compatible fallback for call sites that do not pass onError */}
        {shouldShowDefaultErrorFallback && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-xs text-muted-foreground">Failed to load</p>
          </div>
        )}

        {/* Image - className applied to image for object-fit control */}
        <Image
          src={src}
          alt={alt}
          {...props}
          fill
          unoptimized={props.unoptimized ?? shouldBypassOptimizer}
          className={cn(
            fadeIn && 'transition-opacity duration-300',
            isLoading && fadeIn ? 'opacity-0' : 'opacity-100',
            className, // User can specify object-cover, object-contain, etc.
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // For width/height props - use wrapper that doesn't constrain image size
  return (
    <div className="relative inline-block">
      {/* Skeleton overlay - positioned absolute, doesn't affect image layout */}
      {isLoading && (
        <Skeleton
          className={cn('absolute inset-0 z-10 rounded-lg', skeletonClassName)}
        />
      )}

      {/* Backward-compatible fallback for call sites that do not pass onError */}
      {shouldShowDefaultErrorFallback && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">Failed to load</p>
        </div>
      )}

      {/* Image - preserves original className and sizing behavior */}
      <Image
        src={src}
        alt={alt}
        {...props}
        unoptimized={props.unoptimized ?? shouldBypassOptimizer}
        className={cn(
          fadeIn && 'transition-opacity duration-300',
          isLoading && fadeIn ? 'opacity-0' : 'opacity-100',
          className, // Apply className directly to image
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
