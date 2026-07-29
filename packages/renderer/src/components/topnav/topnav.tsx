
import { Tab, TabList } from '@astryxdesign/core';
import { MinusIcon, Square2StackIcon, XMarkIcon, LockClosedIcon } from '@heroicons/react/16/solid';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from '@tanstack/react-store';
import { setActiveWebview } from '~/stores/webview-store';
import { useNavigate } from '@tanstack/react-router';
import { collapsible } from '~/stores/collapsible';
import { destroyWebview } from '~/hooks/useWebviewSlot';
import { workspaceStore } from '~/stores/workspace-store';
import { webviewStore } from '~/stores/webview-store';

const isWin = navigator.platform.startsWith('Win')

export default function TopNav() {
	const [isMaximized, setIsMaximized] = useState(false)
	const navigate = useNavigate()
	const activeWebviews = useSelector(webviewStore, s => s.webviews)
	const activeWebviewId = useSelector(webviewStore, s => s.activeWebviewId ?? "")
	useEffect(() => {
		if (!window.windowControls) return
		window.windowControls.onMaximizedChange(setIsMaximized)
	}, [])
	const handleMinimize = useCallback(() => window.windowControls?.minimize(), [])
	const handleMaximize = useCallback(() => window.windowControls?.maximize(), [])
	const handleClose = useCallback(() => window.windowControls?.close(), [])
	const isCollapsible = useSelector(collapsible)
	const workspaces = useSelector(workspaceStore, s => s.workspaces)
	const allChats = workspaces.flatMap(w => w.chats)

	const handleCloseWebview = useCallback((e: React.MouseEvent, webviewId: string) => {
		e.stopPropagation()
		destroyWebview(webviewId)
		const idx = activeWebviews.findIndex(w => w.id === webviewId)
		const remaining = activeWebviews.filter(w => w.id !== webviewId)
		if (remaining.length === 0) {
			navigate({ to: '/' })
		} else {
			// Navigate to the previous webview, or the first one if closing the first tab
			const next = remaining[Math.min(idx, remaining.length - 1)]
			navigate({ to: '/chat/$chatId', params: { chatId: String(next.chatId) } })
		}
	}, [activeWebviews, navigate])

	const handleSelectWebview = useCallback((chatId: number, webviewId: string) => {
		navigate({ to: '/chat/$chatId', params: { chatId: String(chatId) } })
		console.log('handleSelectWebview', chatId, webviewId)
		setActiveWebview(webviewId)
	}, [navigate])

	return <div className="w-full py-1 flex items-center justify-between px-4 app-shell-top-nav" style={{ height: 'var(--app-top-nav-height)' }}>
		<div className="flex items-center gap-2" style={{ marginLeft: isCollapsible ? '80px' :  '250px' }}>
			<TabList value={activeWebviewId } onChange={setActiveWebview} className="select-none">
				{activeWebviews.map((w) => {
					const chat = allChats.find(c => c.id === w.chatId)
					const label = chat?.title ?? w.platform
					return (
						<Tab
							key={w.id}
							value={String(w.id)}
							label={label}
							onClick={() => handleSelectWebview(w.chatId, w.id)}
							endContent={
								<XMarkIcon
									className="size-3.5 cursor-pointer hover:text-red-500"
									onClick={(e: any) => handleCloseWebview(e, w.id)}
								/>
							}
						/>
					)
				})}
			</TabList>
		</div>
		{
			isWin && (<div className="title-bar-controls">
				<button className="title-bar-btn" onClick={handleMinimize} aria-label="Minimize">
					<MinusIcon className="size-3.5" />
				</button>
				<button className="title-bar-btn" onClick={handleMaximize} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
					<Square2StackIcon className="size-3.5" />
				</button>
				<button className="title-bar-btn title-bar-close" onClick={handleClose} aria-label="Close">
					<XMarkIcon className="size-3.5" />
				</button>
			</div>)
		}
	</div>
}