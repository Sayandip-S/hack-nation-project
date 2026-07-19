import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-800/50">
          <div className="max-w-lg w-full bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h1 className="text-lg font-semibold text-zinc-100">Something went wrong</h1>
            <p className="text-sm text-zinc-400 mt-2">{this.state.error.message}</p>
            <pre className="mt-3 text-xs text-zinc-400 overflow-auto max-h-40 bg-zinc-800/50 p-3 rounded-lg">
              {this.state.error.stack}
            </pre>
            <button
              className="mt-4 px-4 py-2 rounded-lg bg-teal-950 text-white text-sm"
              onClick={() => {
                localStorage.removeItem("keyline.session");
                window.location.href = "/welcome";
              }}
            >
              Reset & go to welcome
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
