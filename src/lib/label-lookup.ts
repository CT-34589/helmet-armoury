import { unstable_cache } from "next/cache"
import { prisma } from "./prisma"

export const getItemLabelMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const items = await prisma.configItem.findMany({ select: { name: true, label: true } })
    return Object.fromEntries(items.map((i) => [i.name, i.label]))
  },
  ["item-label-map"],
  { revalidate: 86400, tags: ["config"] }
)

export function resolveLabels(names: string[], labelMap: Record<string, string>): string[] {
  return names.map((n) => labelMap[n] ?? n)
}