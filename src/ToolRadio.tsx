import { TTool } from './App'
import styles from './ToolRadio.module.css'
import selectionSrc from './assets/selection.svg'
import lineSrc from './assets/line.svg'
import rectangleSrc from './assets/rectangle.svg'
import pencilSrc from './assets/pencil.svg'
import textSrc from './assets/text.svg'
import handSrc from './assets/hand.svg'
import arrowSrc from './assets/arrow.svg'

export function ToolRadio({
  toolName,
  currentTool,
  setCurrentTool,
}: {
  toolName: TTool
  currentTool: TTool
  setCurrentTool: React.Dispatch<React.SetStateAction<TTool>>
}) {
  const srcMap: Record<TTool, string> = {
    selection: selectionSrc,
    line: lineSrc,
    rectangle: rectangleSrc,
    pencil: pencilSrc,
    text: textSrc,
    hand: handSrc,
    arrow: arrowSrc,
  }

  return (
    <>
      <input
        type="radio"
        name="tool-selector"
        id={toolName}
        checked={currentTool === toolName}
        onChange={() => setCurrentTool(toolName)}
        className={styles.radioInput}
      />
      <label htmlFor={toolName} className={styles.radioLabel}>
        <img src={srcMap[toolName]} alt={toolName} width={24} />
      </label>
    </>
  )
}
