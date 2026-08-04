export interface Session {
  id: string;
  name: string;
  created_at: string;
  is_named: boolean;
  user_id?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  turn?: number;
  graph_state?: Record<string, unknown>;
  pending?: boolean;
  isBtw?: boolean;
  /** Human-readable name of the graph step currently running. */
  stage?: string;
}

export interface DocResult {
  name: string;
  status: "ok" | "error";
  error?: string;
}

export type ChatStreamEvent =
  | { type: "token"; content: string }
  | { type: "stage"; node: string; label: string }
  | {
      type: "done";
      answer?: string;
      graph_state?: Record<string, unknown>;
      session_name?: string | null;
    };
