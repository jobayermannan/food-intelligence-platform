export type SelectNavigationKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export function nextOptionIndex(current: number, length: number, key: SelectNavigationKey) {
  if (!length) return -1;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowDown") return (current + 1 + length) % length;
  return (current - 1 + length) % length;
}
