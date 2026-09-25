import assert from "node:assert/strict"
import test from "node:test"
import type { CutEditor } from "../src/cut"
import { cutSelectedText } from "../src/cut"

function fakeEditor(text = "selected") {
  let selection: { start: number; end: number } | null = text ? { start: 0, end: text.length } : null
  let selectedText = text
  let deleted = false

  const editor: CutEditor = {
    plainText: text,
    hasSelection: () => selection !== null,
    getSelection: () => selection,
    getSelectedText: () => selectedText,
    deleteSelection: () => {
      if (!selection) return false
      deleted = true
      selection = null
      selectedText = ""
      return true
    },
  }

  return {
    editor,
    deleted: () => deleted,
    changeSelection: () => {
      selection = { start: 1, end: 2 }
      selectedText = "e"
    },
  }
}

test("cutSelectedText copies before deleting", async () => {
  const fake = fakeEditor()
  const copied: string[] = []

  const result = await cutSelectedText(fake.editor, async (text) => {
    assert.equal(fake.deleted(), false)
    copied.push(text)
  })

  assert.equal(result, "cut")
  assert.deepEqual(copied, ["selected"])
  assert.equal(fake.deleted(), true)
})

test("cutSelectedText does nothing without a selection", async () => {
  const fake = fakeEditor("")
  let copied = false

  const result = await cutSelectedText(fake.editor, async () => {
    copied = true
  })

  assert.equal(result, "no-selection")
  assert.equal(copied, false)
  assert.equal(fake.deleted(), false)
})

test("cutSelectedText preserves text when clipboard writing fails", async () => {
  const fake = fakeEditor()

  await assert.rejects(
    cutSelectedText(fake.editor, async () => {
      throw new Error("clipboard failed")
    }),
    /clipboard failed/,
  )
  assert.equal(fake.deleted(), false)
})

test("cutSelectedText never deletes a selection changed during copy", async () => {
  const fake = fakeEditor()

  const result = await cutSelectedText(fake.editor, async () => {
    fake.changeSelection()
  })

  assert.equal(result, "selection-changed")
  assert.equal(fake.deleted(), false)
})

test("cutSelectedText preserves the editor after focus is lost", async () => {
  const fake = fakeEditor()
  const result = await cutSelectedText(fake.editor, async () => {}, () => false)
  assert.equal(result, "selection-changed")
  assert.equal(fake.deleted(), false)
})

test("cutSelectedText snapshots mutable selection bounds before copying", async () => {
  const fake = fakeEditor()
  const result = await cutSelectedText(fake.editor, async () => {
    fake.editor.getSelection()!.start = 1
  })
  assert.equal(result, "selection-changed")
  assert.equal(fake.deleted(), false)
})

test("cutSelectedText preserves changed content even if the selected text matches", async () => {
  const fake = fakeEditor()
  let content = "selected before"
  Object.defineProperty(fake.editor, "plainText", { get: () => content })
  const result = await cutSelectedText(fake.editor, async () => {
    content = "selected after"
  })
  assert.equal(result, "selection-changed")
  assert.equal(fake.deleted(), false)
})
