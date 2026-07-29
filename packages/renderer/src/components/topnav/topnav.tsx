
import { Button } from '@astryxdesign/core';
import { MinusIcon, Square2StackIcon, XMarkIcon, HomeIcon } from '@heroicons/react/16/solid';
import { useCallback, useEffect, useState } from 'react';

const isWin = navigator.platform.startsWith('Win')

export default function TopNav() {
	const [isMaximized, setIsMaximized] = useState(false)
	useEffect(() => {
		if (!window.windowControls) return
		window.windowControls.onMaximizedChange(setIsMaximized)
	}, [])
	const handleMinimize = useCallback(() => window.windowControls?.minimize(), [])
	const handleMaximize = useCallback(() => window.windowControls?.maximize(), [])
	const handleClose = useCallback(() => window.windowControls?.close(), [])

	return <div className="w-full h-12 flex items-center justify-between px-4 app-shell-top-nav">
		<div className="flex items-center gap-2" style={{ marginLeft: 'var(--side-nav-width, 300px)' }}>
			<Button isIconOnly icon={<HomeIcon className="size-3.5" />} label="home" ></Button>
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