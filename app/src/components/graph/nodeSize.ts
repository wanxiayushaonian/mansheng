/** 节点直径：24 + min(degree*5, 44) px */
export function nodeSize(degree: number): number {
  return 24 + Math.min(degree * 5, 44)
}
