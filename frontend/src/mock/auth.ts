import { JobSpec, User } from "../types";
import { defaultJobSpec } from "./data";

export interface AccountRecord {
  user: User;
  password: string;
  onboarded: boolean;
  jobSpec: JobSpec;
}

export const DEMO_ACCOUNTS: AccountRecord[] = [
  {
    user: {
      id: "user-demo",
      name: "John Doe",
      email: "demo@corridoor.ai",
    },
    password: "demo1234",
    onboarded: true,
    jobSpec: defaultJobSpec,
  },
  {
    user: {
      id: "user-sara",
      name: "Sara Chen",
      email: "sara@corridoor.ai",
    },
    password: "sara1234",
    onboarded: true,
    jobSpec: {
      ...defaultJobSpec,
      originCity: "Hamburg",
      destCity: "Berlin",
      originStairs: 1,
      notes: "Studio move — no piano.",
    },
  },
];

export const DEMO_LOGIN = {
  email: "demo@corridoor.ai",
  password: "demo1234",
  name: "John Doe",
};

const SESSION_KEY = "corridoor.session";

export interface PersistedSession {
  email: string;
}

export function saveSession(email: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email } satisfies PersistedSession));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}
