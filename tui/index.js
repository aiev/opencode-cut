// Stable TUI entry point. The TypeScript implementation is built to dist/.
import mod from "../dist/tui.js"

export default {
  id: "aiev.cut.tui",
  setup: mod.setup,
}
