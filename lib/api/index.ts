import { insforge } from '../insforge';
import { ApiState, ApiStatus } from '@/types/dashboard';

/**
 * Global API state for empty/initial results
 */
export const createInitialApiState = <T>(initialData: T | null = null): ApiState<T> => ({
  data: initialData,
  status: 'idle',
  error: null,
  lastUpdated: null,
});

/**
 * Wraps an SDK call with standard error handling and returns an ApiState object.
 */
/**
 * Wraps an SDK call with standard error handling and returns an ApiState object.
 * Now supports both { data, error } style returns and direct data returns.
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<T | { data: T | null; error: any }>
): Promise<ApiState<T>> {
  try {
    const result = await apiCall();

    // 1. Handle { data, error } pattern (SDK/Direct DB style)
    if (result && typeof result === 'object' && ('error' in result || 'data' in result)) {
      const { data, error } = result as { data: T | null; error: any };
      
      if (error) {
        return {
          data: null,
          status: 'error',
          error: error.message || 'An unknown error occurred',
          lastUpdated: new Date(),
        };
      }

      return {
        data: data as T,
        status: 'success',
        error: null,
        lastUpdated: new Date(),
      };
    }

    // 2. Handle direct data return (Modern refactored style)
    return {
      data: result as T,
      status: 'success',
      error: null,
      lastUpdated: new Date(),
    };

  } catch (err: any) {
    return {
      data: null,
      status: 'error',
      error: err.message || 'A network error occurred',
      lastUpdated: new Date(),
    };
  }
}

export { insforge };
