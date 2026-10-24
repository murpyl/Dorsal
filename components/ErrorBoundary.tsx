"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Couldn’t load {this.props.label}</AlertTitle>
        <AlertDescription>{errorMessage(this.state.error)}</AlertDescription>
        <AlertAction>
          <Button size="xs" variant="outline" onClick={() => this.setState({ error: null })}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }
}
