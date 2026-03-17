import { toast } from "sonner";

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class ApiErrorHandler {
  static handleError(error: any): ApiError {
    console.error("API Error:", error);

    // Default error object
    const apiError: ApiError = {
      message: "An unexpected error occurred",
      status: 500,
    };

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      apiError.status = status;

      if (data?.detail) {
        // FastAPI error format
        if (typeof data.detail === "string") {
          apiError.message = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Validation errors
          apiError.message = data.detail
            .map((err: any) => `${err.loc?.join(".") || "Field"}: ${err.msg}`)
            .join(", ");
        } else {
          apiError.message = "Invalid request data";
        }
      } else if (data?.message) {
        apiError.message = data.message;
      } else {
        // Default messages based on status code
        switch (status) {
          case 400:
            apiError.message = "Bad request - please check your input";
            break;
          case 401:
            apiError.message = "Please log in to continue";
            break;
          case 403:
            apiError.message = "You do not have permission to perform this action";
            break;
          case 404:
            apiError.message = "The requested resource was not found";
            break;
          case 422:
            apiError.message = "Invalid data provided";
            break;
          case 429:
            apiError.message = "Too many requests - please try again later";
            break;
          case 500:
            apiError.message = "Server error - please try again later";
            break;
          case 503:
            apiError.message = "Service temporarily unavailable";
            break;
          default:
            apiError.message = `Request failed with status ${status}`;
        }
      }
    } else if (error.request) {
      // Network error
      if (error.code === "NETWORK_ERROR" || !navigator.onLine) {
        apiError.message = "No internet connection - please check your network";
      } else if (error.code === "ECONNREFUSED" || error.message.includes("ECONNREFUSED")) {
        apiError.message = "Unable to connect to server - please try again later";
      } else {
        apiError.message = "Network error - please check your connection";
      }
      apiError.status = 0;
    } else if (error.message) {
      // JavaScript/other error
      apiError.message = error.message;
    }

    return apiError;
  }

  static handleErrorWithToast(error: any, customMessage?: string): ApiError {
    const apiError = this.handleError(error);

    const message = customMessage || apiError.message;

    // Show appropriate toast based on error type
    if (apiError.status === 401) {
      toast.error("Authentication required", {
        description: message,
        action: {
          label: "Login",
          onClick: () => (window.location.href = "/login"),
        },
      });
    } else if (apiError.status === 0) {
      toast.error("Connection Error", {
        description: message,
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
      });
    } else if (apiError.status && apiError.status >= 500) {
      toast.error("Server Error", {
        description: message,
        action: {
          label: "Report Issue",
          onClick: () => console.log("Report issue functionality would go here"),
        },
      });
    } else {
      toast.error("Error", {
        description: message,
      });
    }

    return apiError;
  }

  static isRetryableError(error: ApiError): boolean {
    // Define which errors are worth retrying
    if (!error.status) return false;

    return [
      0, // Network errors
      408, // Request timeout
      429, // Too many requests
      500, // Internal server error
      502, // Bad gateway
      503, // Service unavailable
      504, // Gateway timeout
    ].includes(error.status);
  }
}

// Utility function for async operations with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const apiError = ApiErrorHandler.handleError(error);

      if (attempt === maxRetries || !ApiErrorHandler.isRetryableError(apiError)) {
        throw error;
      }

      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));

      console.log(`Retrying operation (attempt ${attempt + 1}/${maxRetries})...`);
    }
  }

  throw lastError;
}

// React Query error handler
export function reactQueryErrorHandler(error: any) {
  const apiError = ApiErrorHandler.handleError(error);

  // Don't show toast for authentication errors in queries (handled by auth interceptor)
  if (apiError.status !== 401) {
    ApiErrorHandler.handleErrorWithToast(error);
  }

  return apiError;
}

export default ApiErrorHandler;
