import { Store } from "@tanstack/react-store";


export const collapsible = new Store<boolean>(true)

export function toggleCollapsible() {
  collapsible.setState((prev) => !prev)
}

export function setCollapsible(value: boolean) {
  collapsible.setState(() => value)
}
