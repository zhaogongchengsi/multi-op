CREATE TABLE `app_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer,
	`position` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`title` text,
	`avatar` text,
	`group_id` integer,
	`position` integer DEFAULT 0,
	`status` text DEFAULT 'active',
	`auto_open` integer DEFAULT 0,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
