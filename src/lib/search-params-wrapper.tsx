import React, { Suspense } from 'react';

interface LoadingProps {
  message?: string;
}

export const DefaultLoading: React.FC<LoadingProps> = ({ message = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
};

/**
 * Wraps a component that uses useSearchParams in a Suspense boundary
 * to prevent the "useSearchParams() should be wrapped in a suspense boundary" error
 * 
 * @param Component The component that uses useSearchParams
 * @param LoadingComponent Optional loading component to show while suspending
 * @returns A wrapped component with proper Suspense boundary
 */
export function withSearchParamsSuspense<P extends object>(
  Component: React.ComponentType<P>,
  LoadingComponent: React.ComponentType = DefaultLoading
) {
  return function WithSearchParamsSuspense(props: P) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <Component {...props} />
      </Suspense>
    );
  };
} 