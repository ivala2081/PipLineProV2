/**
 * Manager PIN used for sensitive operations (e.g. transfer settings, future features).
 * Will be used across multiple parts of the app.
 */
export const MANAGER_PIN = '4561'

export function verifyManagerPin(input: string): boolean {
  return input.trim() === MANAGER_PIN
}
