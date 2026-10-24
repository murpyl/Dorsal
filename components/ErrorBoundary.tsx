"use client";

import { Component, type ReactNode } from "react";
import { errorMessage } from "@/lib/errors";

type Props = { label: string; children: ReactNode };
type State = { error: unknown | null };

/** Keeps one failing live query from blanking the whole page; shows an inline message with Retry. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    if (this.state.error === null) return this.props.children;
    return (
      <section role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>
          Couldn’t load {this.props.label}: {errorMessage(this.state.error)}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-800 hover:bg-red-100"
        >
          Retry
        </button>
      </section>
    );
  }
}
