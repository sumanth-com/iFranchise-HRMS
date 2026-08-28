"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "@/components/common/error-state";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  retryLabel?: string;
  /**
   * Applied to the wrapper around children. Pass "contents" when the boundary sits
   * inside a flex/grid layout that the wrapper would otherwise break.
   */
  contentClassName?: string;
};

type State = {
  error: Error | null;
  resetKey: number;
};

/**
 * Catches render errors in a client subtree so the rest of the page (nav, layout)
 * stays usable instead of triggering the route-level error boundary.
 */
export class ClientSectionBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[client-section-boundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState((prev) => ({ error: null, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title={this.props.title ?? "Couldn't load this section"}
          description={
            this.props.description ??
            "Something went wrong while loading this content. Please try again or refresh the page."
          }
          onRetry={this.handleRetry}
          retryLabel={this.props.retryLabel ?? "Try again"}
          className={this.props.className}
        />
      );
    }

    return (
      <div key={this.state.resetKey} className={this.props.contentClassName}>
        {this.props.children}
      </div>
    );
  }
}
