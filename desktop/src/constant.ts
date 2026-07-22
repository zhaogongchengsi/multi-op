import { join } from "node:path";
import { app } from "electron";

export const workspace = import.meta.env.DEV
	? process.cwd()
	: join(app.getPath('home'), '.multi-op');