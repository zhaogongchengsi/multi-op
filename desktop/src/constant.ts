import { join } from "node:path";
import { app } from "electron";

export const workspace = import.meta.env.DEV
	? join(process.cwd(), '.multi-op')
	: join(app.getPath('home'), '.multi-op');