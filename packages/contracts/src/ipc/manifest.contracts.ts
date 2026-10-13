import { FUTURE_ROUTES } from './future.contracts.js';
import { PROJECT_ROUTES } from './project.contracts.js';
import { SETUP_ROUTES } from './setup.contracts.js';
import { TASK_ROUTES } from './task.contracts.js';

export const IPC_ROUTES = [
  ...Object.values(SETUP_ROUTES),
  ...Object.values(PROJECT_ROUTES),
  ...Object.values(TASK_ROUTES),
  ...Object.values(FUTURE_ROUTES),
] as const;

export const IPC_ROUTE_COUNT = 101 as const;
