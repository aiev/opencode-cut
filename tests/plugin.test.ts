import assert from "node:assert/strict"
import test from "node:test"
import type { Plugin } from "@opencode/plugin/tui"
import plugin, { CUT_COMMAND_ID } from "../src/tui"

test("the TUI plugin registers Ctrl+X as a focused-editor command", () => {
  type LayerFactory = Parameters<Plugin.Context["keymap"]["layer"]>[0]
  let layer: LayerFactory | undefined
  let appRender: (() => unknown) | undefined
  const context = {
    keymap: {
      layer: (value: LayerFactory) => {
        layer = value
      },
    },
    renderer: { currentFocusedEditor: null },
    ui: {
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
  assert.equal(registered.commands?.length, 1)
  assert.equal(registered.commands?.[0].id, CUT_COMMAND_ID)
  assert.equal(registered.commands?.[0].bind, "ctrl+x")
  assert.deepEqual(registered.bindings, [CUT_COMMAND_ID])
})
