import { type Dispatch, createContext, useReducer } from "react";

export interface WithChildren {
  children?: JSX.Element;
}

import { type DefaultType, Storage } from "./utils/storage";

export interface AuthConfig {
  authorizeEndpoint?: string;
  autoRefresh?: boolean;
  clientId: string;
  logoutEndpoint?: string;
  provider: string;
  redirectUri: string;
  scopes: string[];
  tokenEndpoint?: string;
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
}

interface AuthProviderProps extends WithChildren {
  config: AuthConfig;
}

export enum ACTIONS {
  setConfig,
  setToken,
}

type ActionType =
  | { payload: AuthConfig; type: ACTIONS.setConfig }
  | { payload: AuthToken; type: ACTIONS.setToken };

const INITIAL_STATE: AuthState = {
  token: Storage.get<AuthToken>("auth"),
};

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
    default:
      throw new Error("Invalid action.");
  }
};

export const AuthProvider = ({ children, config }: AuthProviderProps) => {
  const [state, dispatch] = useReducer(reducer, { ...INITIAL_STATE, config });

  return (
    <Store.Provider value={{ dispatch, state }}>{children}</Store.Provider>
  );
};
