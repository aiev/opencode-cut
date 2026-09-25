import type { Plugin } from "@opencode/plugin/tui"
import { cutSelectedText } from "./cut.js"

export const CUT_COMMAND_ID = "aiev.cut"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const mod: Plugin.Definition = {
  id: "aiev.cut.tui",

  setup(context) {
    let active = true
    let copying = false
    const unregister = context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          // The renderer's focus getter is not reactive. A target accessor would
          // pin this layer to the editor (or null) present when the app mounts.
          // Resolve the focused editor in enabled/run instead.
          priority: 100,
          commands: [
            {
              id: CUT_COMMAND_ID,
              title: "Cut selected text",
              description: "Copy the selected input text to the clipboard and remove it",
              group: "Text Editing",
              bind: "ctrl+x",
              palette: true,
              enabled: () => Boolean(context.renderer.currentFocusedEditor?.hasSelection()),
              run: () => {
                if (copying) return
                const editor = context.renderer.currentFocusedEditor
                if (!editor?.hasSelection()) return false

                copying = true
                return cutSelectedText(
                  editor,
                  undefined,
                  () => active && context.renderer.currentFocusedEditor === editor,
                )
                  .then((result) => {
                    if (!active || result !== "selection-changed") return
                    context.ui.toast.show({
                      message: "Input or focus changed while copying; text was copied but not deleted.",
                      variant: "warning",
                    })
                  })
                  .catch((error) => {
                    if (!active) return
                    context.ui.toast.show({
                      title: "Cut failed",
                      message: `${errorMessage(error)}. The selection was not deleted.`,
                      variant: "error",
                    })
                  })
                  .finally(() => {
                    copying = false
                  })
              },
            },
          ],
          bindings: [CUT_COMMAND_ID],
        }))
        return null
      },
    })
    return () => {
      active = false
      unregister()
    }
  },
}

export default mod
