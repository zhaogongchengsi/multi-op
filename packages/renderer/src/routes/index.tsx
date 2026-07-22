import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@astryxdesign/core/Card'

function WelcomePage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card>
        <div className="text-center p-8">
          <div className="text-2xl font-semibold mb-2">Welcome to Multi-Op</div>
          <div className="text-gray-500">
            Select a conversation from the sidebar to get started
          </div>
        </div>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: WelcomePage,
})
