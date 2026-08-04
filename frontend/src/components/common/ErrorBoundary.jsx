import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Something went wrong" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-800">Something went wrong</p>
            <p className="mt-1 text-sm text-red-600">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
