// Station: one broken module must not take the page down. Each lazily loaded Scene and Stage sits in one of these.
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Shown in place of the module when it throws. */
  fallback: ReactNode
  onError?: (error: Error) => void
}

export class Boundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
