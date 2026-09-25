import type { EditBufferRenderable } from "@opentui/core"
import { copyText } from "./clipboard.js"

export type CutEditor = Pick<
  EditBufferRenderable,
  "deleteSelection" | "getSelectedText" | "getSelection" | "hasSelection" | "plainText"
>

export type CutResult = "cut" | "no-selection" | "selection-changed"
export type CopyText = (text: string) => Promise<unknown>

function sameSelection(
  left: { start: number; end: number } | null,
  right: { start: number; end: number } | null,
): boolean {
  return left !== null && right !== null && left.start === right.start && left.end === right.end
}

/**
 * Copies and then deletes one editor selection. The selection is checked again
 * after the asynchronous clipboard write so a changed selection is never
 * deleted accidentally.
 */
export async function cutSelectedText(
  editor: CutEditor,
  copy: CopyText = copyText,
  isCurrent: () => boolean = () => true,
): Promise<CutResult> {
  const selection = editor.getSelection()
  if (!selection || !editor.hasSelection()) return "no-selection"

  const range = { ...selection }
  const content = editor.plainText
  const text = editor.getSelectedText()
  if (!text) return "no-selection"

  await copy(text)

  if (!isCurrent()) return "selection-changed"
  const currentSelection = editor.getSelection()
  if (
    editor.plainText !== content ||
    !sameSelection(range, currentSelection) ||
    editor.getSelectedText() !== text
  ) {
    return "selection-changed"
  }

  return editor.deleteSelection() ? "cut" : "selection-changed"
}
