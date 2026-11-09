import "server-only";
import { getServerEnv, type ServerEnv } from "./env";

export const serverEnv: ServerEnv = getServerEnv();
