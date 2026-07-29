
import { Button, Tab, TabList } from '@astryxdesign/core';
import { MinusIcon, Square2StackIcon, XMarkIcon, LockClosedIcon, ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/16/solid';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from '@tanstack/react-store';
import { collapsible } from '~/stores/collapsible';

const isWin = navigator.platform.startsWith('Win')

const StarIcon = (
	<svg
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		width="100%"
		height="100%">
		<path d="m8 1.5 2 4.1 4.5.7-3.3 3.2.8 4.5-4-2.1L4 14l.8-4.5-3.3-3.2 4.5-.7L8 1.5Z" />
	</svg>
);
​
const SelectedStarIcon = (
	<svg viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%">
		<path d="m8 1.5 2 4.1 4.5.7-3.3 3.2.8 4.5-4-2.1L4 14l.8-4.5-3.3-3.2 4.5-.7L8 1.5Z" />
	</svg>
);

export default function TopNav() {
	const [isMaximized, setIsMaximized] = useState(false)
	useEffect(() => {
		if (!window.windowControls) return
		window.windowControls.onMaximizedChange(setIsMaximized)
	}, [])
	const handleMinimize = useCallback(() => window.windowControls?.minimize(), [])
	const handleMaximize = useCallback(() => window.windowControls?.maximize(), [])
	const handleClose = useCallback(() => window.windowControls?.close(), [])
	const isCollapsible = useSelector(collapsible)
	// const [value, setValue] = useState('hourly');

	const [value, setValue] = useState('favorites');

	return <div className="w-full py-1 flex items-center justify-between px-4 app-shell-top-nav">
		<div className="flex items-center gap-2" style={{ marginLeft: isCollapsible ? '80px' :  '250px' }}>
			{/* <Button isIconOnly icon={<HomeIcon className="size-3.5" />} label="home" ></Button> */}
			{/* <SegmentedControl
				value={value}
				onChange={setValue}
				label="Data granularity">
				<SegmentedControlItem value="hourly" label="Hourly" />
				<SegmentedControlItem value="daily" label="Daily" />
				<SegmentedControlItem value="weekly" label="Weekly" />
			</SegmentedControl> */}
			<TabList value={value} onChange={setValue} className="select-none">
				<Tab
					value="favorites"
					label="Favorites"
					endContent={
						<LockClosedIcon className="size-3.5" />
					}
				/>
				<Tab value="recent" label="Recent" />
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