import { WebContentElement } from './element'

/**
 * Register the `<webcontent>` custom element. Safe to call multiple times.
 *
 * Call once during renderer bootstrap.
 */
export function registerWebContentElement(): void {
  if (!customElements.get('web-content')) {
    customElements.define('web-content', WebContentElement)
  }
}
