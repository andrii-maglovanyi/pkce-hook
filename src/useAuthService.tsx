import { useCallback, useContext, useEffect } from "react";

import { type AuthToken, ACTIONS, Store } from "./AuthProvider";
import { base64URLEncode, createPKCECodes, randomBytes } from "./utils/pkce";
import { Storage } from "./utils/storage";
import { Url } from "./utils/url";

const codeChallengeMethod = "S256";

const isAuthenticated = () => {
  const auth = Storage.get("auth");
  if (!auth) return false;

  const { access_token, error } = auth;

  return Boolean(access_token) && !error;
};

const isPending = () => Boolean(Storage.get("auth-handshake")?.isPending);

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

  const { config } = state;

  if (!config) {
    throw new Error("AuthProvider not found.");
  }

  const {
    authorizeEndpoint,
    autoRefresh,
    clientId,
    logoutEndpoint,
    provider,
    redirectUri,
    scopes,
    tokenEndpoint,
  } = config;

  const fetchToken = useCallback(
    async (params: Record<string, string>) => {
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

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    [provider, tokenEndpoint]
  );

  const exchangeAuthorizationCodeForAccessToken = useCallback(
    async (authorizationCode: string) =>
      fetchToken({
        client_id: clientId,
        code: authorizationCode,
        code_verifier: getCodeVerifier(),
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    [clientId, fetchToken, redirectUri]
  );

  const exchangeRefreshTokenForAccessToken = useCallback(
    async (refreshToken: string) =>
      fetchToken({
        client_id: clientId,
        grant_type: "refresh_token",
        redirect_uri: redirectUri,
        refresh_token: refreshToken,
      }),
    [clientId, fetchToken, redirectUri]
  );

  const login = useCallback(async () => {
    const authHandshake = Storage.get("auth-handshake");
    if (authHandshake?.isPending) return;

    const pkce = await createPKCECodes();
    const state = base64URLEncode(await randomBytes(16));
    Storage.set("auth-handshake", { ...pkce, state });
    Storage.remove("auth");
    const codeChallenge = pkce.codeChallenge;

    const authorizationUrl = new URL(
      authorizeEndpoint || `${provider}/authorize`
    );
    authorizationUrl.searchParams.append("response_type", "code");
    authorizationUrl.searchParams.append("client_id", clientId);
    authorizationUrl.searchParams.append("scope", scopes.join(" "));
    authorizationUrl.searchParams.append("redirect_uri", redirectUri);
    authorizationUrl.searchParams.append("state", state);
    authorizationUrl.searchParams.append("code_challenge", codeChallenge);
    authorizationUrl.searchParams.append(
      "code_challenge_method",
      codeChallengeMethod
    );

    window.location.replace(authorizationUrl.toString());
  }, [authorizeEndpoint, clientId, provider, redirectUri, scopes]);

  const logout = (logoutFromProvider = false) => {
    Storage.remove("auth");

    if (logoutFromProvider) {
      const logoutUrl = new URL(logoutEndpoint || `${provider}/logout`);
      logoutUrl.searchParams.append("client_id", clientId);
      logoutUrl.searchParams.append("post_logout_redirect_uri", redirectUri);

      window.location.replace(logoutUrl.toString());
      return true;
    } else {
      window.location.reload();
      return true;
    }
  };

  const saveAuthToken = useCallback(
    (payload: AuthToken) => {
      const refreshSlack = 5;
      const now = new Date().getTime();
      payload.expires_at = now + (+payload.expires_in + refreshSlack) * 1000;

      Storage.set("auth", payload);
      dispatch({ payload, type: ACTIONS.setToken });
    },
    [dispatch]
  );

  useEffect(() => {
    const auth = Storage.get("auth");
    const authHandshake = Storage.get("auth-handshake");

    if (auth || authHandshake?.isPending) return;

    const getAccessToken = async () => {
      const { code } = Url.parseQueryString();

      if (code) {
        Storage.set("auth-handshake", { isPending: true });

        try {
          const payload = await exchangeAuthorizationCodeForAccessToken(code);

          saveAuthToken(payload);

          Storage.remove("auth-handshake");
          Url.removeQueryString();
        } catch (error) {
          Storage.remove("auth");
          Storage.remove("auth-handshake");
          console.error("Failed to fetch access token:", error);
        }
      }
    };

    getAccessToken();
  }, [
    autoRefresh,
    dispatch,
    exchangeAuthorizationCodeForAccessToken,
    saveAuthToken,
  ]);

  useEffect(() => {
    const { token } = state;
    const { expires_at, refresh_token } = token || {};

    if (refreshTimeout) return;
    if (!autoRefresh || !expires_at || !refresh_token) return;

    const timeoutDuration = expires_at - new Date().getTime();

    if (timeoutDuration <= 0) {
      Storage.remove("auth");
      return;
    }

    refreshTimeout = setTimeout(async () => {
      const payload = await exchangeRefreshTokenForAccessToken(refresh_token);

      saveAuthToken(payload);
    }, timeoutDuration);

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
    };
  }, [
    autoRefresh,
    dispatch,
    exchangeRefreshTokenForAccessToken,
    saveAuthToken,
    state,
  ]);

  return { authState: state.token, isAuthenticated, isPending, login, logout };
};
