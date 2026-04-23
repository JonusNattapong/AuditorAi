import React from 'react';
import { render, Text, type RenderOptions } from 'ink';
import chalk from 'chalk';
import figures from 'figures';

/**
 * REDLOCK AuditorAi TUI Helpers
 * Derived from advanced agentic patterns for clean terminal management.
 */

export interface ExitOptions {
  color?: string;
  exitCode?: number;
  beforeExit?: () => Promise<void> | void;
}

/**
 * Render a component through Ink and wait for it to finish.
 * Returns a Promise that resolves when the component calls done(result).
 */
export function showDialog<T = void>(renderer: (done: (result: T) => void) => React.ReactNode): Promise<T> {
  return new Promise<T>((resolve) => {
    const { unmount, rerender } = render(<React.Fragment />);

    const done = (result: T): void => {
      unmount();
      resolve(result);
    };

    rerender(
      <React.Fragment>
        {renderer(done)}
      </React.Fragment>
    );
  });
}

/**
 * Render a message through Ink, then unmount and exit.
 * This ensures the terminal state is restored correctly.
 */
export async function exitWithMessage(message: string, options?: ExitOptions): Promise<never> {
  const color = options?.color || 'white';
  const exitCode = options?.exitCode ?? 0;

  // Use Ink to render the final message to ensure it aligns with TUI output
  const { unmount } = render(
    <Text color={color as any}>
      {message}
    </Text>
  );

  // Clean up Ink
  unmount();

  // Execute any pre-exit hooks (e.g. stopping processes, closing files)
  if (options?.beforeExit) {
    await options.beforeExit();
  }

  process.exit(exitCode);
}

/**
 * Render an error message through Ink, then unmount and exit with error code.
 */
export async function exitWithError(message: string, error?: Error): Promise<never> {
  const errorMessage = error ? `${message}: ${error.message}` : message;

  return exitWithMessage(
    `\n${chalk.red(figures.cross)} ${chalk.bold('CRITICAL ERROR')}\n${chalk.white(errorMessage)}\n`,
    {
      color: 'red',
      exitCode: 1
    }
  );
}

/**
 * Graceful shutdown handler for REDLOCK AuditorAi.
 * Ensures spinners are stopped and processes are killed before exiting.
 */
export async function gracefulShutdown(code: number = 0) {
  // Stop any active ora spinners
  if ((global as any).currentSpinner) {
    try {
      (global as any).currentSpinner.stop();
    } catch (e) { }
  }

  // Clear any HUD intervals
  if ((global as any).hudInterval) {
    clearInterval((global as any).hudInterval);
  }

  // Kill any background processes if necessary
  if ((global as any).shellProcesses) {
    for (const [id, proc] of (global as any).shellProcesses.entries()) {
      try {
        proc.kill();
      } catch (e) { }
    }
  }

  process.exit(code);
}
