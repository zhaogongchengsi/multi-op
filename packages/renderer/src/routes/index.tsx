import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/Layout'
import * as stylex from '@stylexjs/stylex'

const s = stylex.create({
  container: {
    padding: 32,
  },
})

function HomePage() {
  return (
    <VStack xstyle={s.container}>
      <h1 className="text-3xl font-bold">MultiOp</h1>
      <p>Multi-platform multi-opener</p>
      <Button label="Hello AstrYx" onClick={() => alert('Hi!')} />
    </VStack>
  )
}

export const Route = createFileRoute('/')({
  component: HomePage,
})
