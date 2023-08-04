import { useCallback, useContext, useEffect } from "react";

import { type AuthToken, ACTIONS, Store } from "./AuthProvider.js";
import { base64URLEncode, createPKCECodes, randomBytes } from "./utils/pkce.js";
import { Storage } from "./utils/storage.js";
import { Url } from "./utils/url.js";

const REFRESH_SLACK = 5;

const isPending = () => Boolean(Storage.get("auth-handshake")?.isPending);
const setIsPending = (isPending: boolean) =>
  Storage.set("auth-handshake", { isPending });

const isAuthenticated = () => {
  if (isPending()) return false;

  const auth = Storage.get<AuthToken>("auth");

  if (!auth) return false;

  const { access_token, error } = auth;

  return Boolean(access_token) && !error;
};

let refreshTimeout: NodeJS.Timeout | null = null;

const getCodeVerifier = () => {
  const authHandshake = Storage.get("auth-handshake");
  if (typeof authHandshake?.codeVerifier !== "string") {
    throw new Error("Code verifier not found");
  } else {
    return authHandshake.codeVerifier;
  }
};

export const useAuthService = () => {
  const { dispatch, state } = useContext(Store);

  const fetchToken = useCallback(
    async (params: Record<string, string>) => {
      if (!state.config || isPending()) return;

      setIsPending(true);

      const { provider, tokenEndpoint } = state.config;
      const tokenUrl = new URL(tokenEndpoint || `${provider}/token`);

      const requestBody = Object.entries(params).reduce(
        (requestBody, [prop, value]) => {
          requestBody.append(prop, value);
          return requestBody;
        },
        new URLSearchParams()
      );

      const response = await fetch(tokenUrl.toString(), {
        body: requestBody,
        method: "POST",
      });

      const data = await response.json();

      setIsPending(false);

      return data;
    },
    [state.config]
  );

  const exchangeAuthorizationCodeForAccessToken = useCallback(
    async (authorizationCode: string) => {
      if (!state.config) return;
      const { clientId, redirectUri } = state.config;

      return fetchToken({
        client_id: clientId,
        code: authorizationCode,
        code_verifier: getCodeVerifier(),
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });
    },
    [fetchToken, state.config]
  );

  const exchangeRefreshTokenForAccessToken = useCallback(
    async (refreshToken: string): Promise<AuthToken | undefined> => {
      if (!state.config) return;

      const { clientId, redirectUri } = state.config;

      return fetchToken({
        client_id: clientId,
        grant_type: "refresh_token",
        redirect_uri: redirectUri,
        refresh_token: refreshToken,
      });
    },
    [fetchToken, state.config]
  );

  const login = useCallback(async () => {
    if (isPending()) return;
    Storage.remove("auth");

    if (!state.config) {
      console.error("No auth context.");
      return;
    }

    const { authorizeEndpoint, provider, clientId, scopes, redirectUri } =
      state.config;

    const pkce = await createPKCECodes();
    const authState = base64URLEncode(await randomBytes(16));
    Storage.set("auth-handshake", { ...pkce, state: authState });
    Storage.remove("auth");
    const codeChallenge = pkce.codeChallenge;

    const authorizationUrl = new URL(
      authorizeEndpoint || `${provider}/authorize`
    );
    authorizationUrl.searchParams.append("response_type", "code");
    authorizationUrl.searchParams.append("client_id", clientId);
    authorizationUrl.searchParams.append("scope", scopes.join(" "));
    authorizationUrl.searchParams.append("redirect_uri", redirectUri);
    authorizationUrl.searchParams.append("state", authState);
    authorizationUrl.searchParams.append("code_challenge", codeChallenge);
    authorizationUrl.searchParams.append("code_challenge_method", "S256");

    window.location.replace(authorizationUrl.toString());
  }, [state.config]);

  const logout = useCallback(
    (logoutFromProvider = false) => {
      const auth = Storage.get<AuthToken>("auth");
      if (!auth) return;

      if (!state.config) {
        console.error("No auth context.");
        return;
      }

      const { clientId, logoutEndpoint, provider, redirectUri } = state.config;

      Storage.remove("auth");

      if (logoutFromProvider) {
        const logoutUrl = new URL(logoutEndpoint || `${provider}/logout`);
        logoutUrl.searchParams.append("client_id", clientId);
        logoutUrl.searchParams.append("post_logout_redirect_uri", redirectUri);
        logoutUrl.searchParams.append("id_token_hint", auth.id_token);

        window.location.replace(logoutUrl.toString());
      } else {
        window.location.reload();
      }
    },
    [state.config]
  );

  const saveAuthToken = useCallback(
    (payload?: AuthToken) => {
      if (!payload) return;

      if (payload.error) {
        console.error(payload.error);
        dispatch({ payload: payload.error, type: ACTIONS.setError });
      } else {
        const now = new Date().getTime();
        payload.expires_at = now + (+payload.expires_in + REFRESH_SLACK) * 1000;
      }

      Storage.set("auth", payload);
      Storage.remove("auth-handshake");
      dispatch({ payload, type: ACTIONS.setToken });
    },
    [dispatch]
  );

  const getAccessToken = useCallback(async () => {
    if (isPending()) return;

    const auth = Storage.get<AuthToken>("auth");

    if (!auth || auth.error) return;

    const { expires_at, refresh_token, access_token } = auth;
    if (!expires_at || !access_token) return;
    if (expires_at - new Date().getTime() > 0) return auth;

    if (!refresh_token || !state.config) return;

    const payload = await exchangeRefreshTokenForAccessToken(refresh_token);

    saveAuthToken(payload);

    return payload;
  }, [exchangeRefreshTokenForAccessToken, saveAuthToken]);

  const renewAccessToken = useCallback(async () => {
    const auth = Storage.get<AuthToken>("auth");

    if (!auth || isPending() || auth.error) return;

    const { refresh_token } = auth;

    if (!refresh_token || !state.config) return;

    const payload = await exchangeRefreshTokenForAccessToken(refresh_token);

    saveAuthToken(payload);

    return payload;
  }, [exchangeRefreshTokenForAccessToken, saveAuthToken]);

  useEffect(() => {
    if (!state.config) return;

    const auth = Storage.get<AuthToken>("auth");

    if (auth || isPending()) return;

    const fetchAccessToken = async () => {
      const { code, state: authState } = Url.parseQueryString();

      if (code) {
        if (Storage.get("auth-handshake")?.state !== authState) {
          Storage.remove("auth-handshake");
          Url.removeQueryString();
          return;
        }

        try {
          const payload = await exchangeAuthorizationCodeForAccessToken(code);

          saveAuthToken(payload);

          Url.removeQueryString();
        } catch (error) {
          Storage.remove("auth");
          Storage.remove("auth-handshake");
          Url.removeQueryString();

          const payload = "Failed to fetch access token";
          dispatch({ payload, type: ACTIONS.setError });
          console.error(`${payload}:`, error);
        }
      }
    };

    fetchAccessToken();
  }, [dispatch, exchangeAuthorizationCodeForAccessToken, saveAuthToken]);

  useEffect(() => {
    if (!state.config) return;

    const { token } = state;
    const { expires_at, refresh_token } = token || {};

    const { autoRefresh } = state.config || {};

    if (refreshTimeout || state.error) return;
    if (!autoRefresh || !expires_at || !refresh_token) return;

    const timeoutDuration = expires_at - new Date().getTime();

    if (timeoutDuration <= 0) {
      Storage.remove("auth");
      return;
    }

    refreshTimeout = setTimeout(async () => {
      const payload = await exchangeRefreshTokenForAccessToken(refresh_token);

      if (payload?.error) {
        Storage.remove("auth");
        login();
      }

      saveAuthToken(payload);
    }, timeoutDuration);

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
    };
  }, [dispatch, exchangeRefreshTokenForAccessToken, saveAuthToken, state]);

  return {
    authState: state.token,
    authError: state.error,
    getAccessToken,
    isAuthenticated,
    isPending,
    login,
    logout,
    renewAccessToken,
  };
};
