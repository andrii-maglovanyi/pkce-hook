import React, { type Dispatch, createContext, useReducer, ReactNode } from "react";

export interface WithChildren {
  children?: JSX.Element | ReactNode;
}

import { type DefaultType, Storage } from "./utils/storage.js";

export interface AuthConfig {
  authorizeEndpoint?: string;
  autoRefresh?: boolean;
  clientId: string;
  logoutEndpoint?: string;
  provider: string;
  redirectUri: string;
  scopes: string[];
  tokenEndpoint?: string;
  namespace?: string;
}

export interface AuthToken extends DefaultType {
  access_token: string;
  error?: string;
  expires_at: number;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: "bearer";
}

interface AuthState {
  config?: AuthConfig;
  token: AuthToken | null;
  error?: string;
}

interface AuthProviderProps extends WithChildren {
  config: AuthConfig;
}

export enum ACTIONS {
  setConfig,
  setToken,
  setError,
}

type ActionType =
  | { payload: AuthConfig; type: ACTIONS.setConfig }
  | { payload: AuthToken; type: ACTIONS.setToken }
  | { payload: string; type: ACTIONS.setError };

const INITIAL_STATE: AuthState = { token: null };

const context: { dispatch: Dispatch<ActionType>; state: AuthState } = {
  dispatch: () => {},
  state: INITIAL_STATE,
};

export const Store = createContext(context);

const reducer = (state: AuthState, action: ActionType): AuthState => {
  switch (action.type) {
    case ACTIONS.setConfig:
      return { ...state, config: action.payload };
    case ACTIONS.setToken:
      return { ...state, token: action.payload };
    case ACTIONS.setError:
      return { ...state, error: action.payload };
    default:
      throw new Error("Invalid action.");
  }
};

export const AuthProvider = ({ children, config }: AuthProviderProps) => {
  const authToken = Storage.get<AuthToken>(`${config?.namespace ?? ""}auth`);

  const [state, dispatch] = useReducer(reducer, {
    token: authToken,
    error: authToken?.error,
    config: {
      ...config,
      namespace: config.namespace ? `${config.namespace}.` : "",
    },
  });

  return (
    <Store.Provider value={{ dispatch, state }}>{children}</Store.Provider>
  );
};
