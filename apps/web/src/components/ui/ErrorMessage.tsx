interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: "inline" | "card" | "fullPage";
}

export function ErrorMessage({
  title = "오류가 발생했습니다",
  message,
  onRetry,
  variant = "inline",
}: ErrorMessageProps) {
  const errorIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
        {errorIcon}
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-red-600 dark:text-red-400 hover:underline text-sm font-medium"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-card p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
          {errorIcon}
        </div>
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  // fullPage
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
