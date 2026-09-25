import assert from "node:assert/strict"
import test from "node:test"
import clipboard from "clipboardy"
import type { Plugin } from "@opencode/plugin/tui"
import type { CutEditor } from "../src/cut"
import plugin, { CUT_COMMAND_ID } from "../src/tui"

test("Ctrl+X works when focus arrives after mounting and moves to another editor", async (t) => {
  type LayerFactory = Parameters<Plugin.Context["keymap"]["layer"]>[0]
  let layer: LayerFactory | undefined
  let appRender: (() => unknown) | undefined
  const renderer: { currentFocusedEditor: CutEditor | null } = { currentFocusedEditor: null }
  const context = {
    keymap: {
      layer: (value: LayerFactory) => {
        layer = value
      },
    },
    renderer,
    ui: {
      toast: { show: () => assert.fail("a stable cut should not show a warning") },
      slot: (claim: { append?: string; render: () => unknown }) => {
        assert.equal(claim.append, "app")
        appRender = claim.render
        return () => {}
      },
    },
  } as unknown as Plugin.Context

  plugin.setup(context)
  assert.equal(Boolean(layer), false, "keymaps must wait for the app's provider")
  assert.ok(appRender)
  appRender()

  const registered = layer?.()
  assert.ok(registered)
  assert.equal(registered.mode, "global")
  assert.equal(registered.target, undefined, "a non-reactive focus getter cannot scope the layer")
  assert.equal(registered.commands?.length, 1)
  assert.equal(registered.commands?.[0].id, CUT_COMMAND_ID)
  assert.equal(registered.commands?.[0].bind, "ctrl+x")
  assert.deepEqual(registered.bindings, [CUT_COMMAND_ID])

  const command = registered.commands![0]
  assert.equal(typeof command.enabled, "function")
  const enabled = command.enabled as () => boolean
  assert.equal(enabled(), false)
  assert.equal(command.run(), false)

  const copied: string[] = []
  t.mock.method(clipboard, "write", async (text: string) => {
    assert.equal(renderer.currentFocusedEditor?.plainText, text, "copy before deleting")
    copied.push(text)
  })

  for (const text of ["first editor", "second editor"]) {
    const editor: CutEditor = {
      plainText: text,
      hasSelection: () => editor.plainText.length > 0,
      getSelection: () => ({ start: 0, end: editor.plainText.length }),
      getSelectedText: () => editor.plainText,
      deleteSelection: () => {
        Object.defineProperty(editor, "plainText", { value: "", configurable: true })
        return true
      },
    }
    renderer.currentFocusedEditor = editor
    assert.equal(enabled(), true)
    await command.run()
    assert.equal(editor.plainText, "")
    assert.equal(enabled(), false)
  }
  assert.deepEqual(copied, ["first editor", "second editor"])
})
