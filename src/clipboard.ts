import clipboard from "clipboardy"

/** A terminal escape write alone cannot confirm a successful clipboard copy. */
export async function copyText(text: string): Promise<void> {
  await clipboard.write(text)
}
