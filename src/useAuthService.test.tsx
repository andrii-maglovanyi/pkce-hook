import React from "react";
import { waitFor, renderHook } from "@testing-library/react";

import { AuthProvider, type WithChildren } from "./AuthProvider.js";
import { useAuthService } from "./useAuthService.js";

const config = {
  clientId: "test-client-id",
  provider: "https://example.com/oauth2",
  redirectUri: "https://local.com/callback",
  scopes: ["openid", "profile", "email"],
};

const wrapper = {
  wrapper: ({ children }: WithChildren) => (
    <AuthProvider config={config}>{children}</AuthProvider>
  ),
};

beforeEach(() => {
  window.location.replace = jest.fn();

  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useAuthService", () => {
  test("should log error if config is not provided", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { current } = renderHook(() => useAuthService()).result;
    current.login();
    expect(console.error).toHaveBeenCalledWith("No auth context.");
  });

  test("should redirect to auth endpoint", async () => {
    const { result } = renderHook(() => useAuthService(), wrapper);

    expect(window.location.replace).not.toHaveBeenCalled();
    result.current.login();

    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledTimes(1);
    });

    const pkce = JSON.parse(localStorage.getItem("auth-handshake") ?? "{}");

    expect(window.location.replace).toBeCalledWith(
      `https://example.com/oauth2/authorize?response_type=code&client_id=test-client-id&scope=openid+profile+email&redirect_uri=https%3A%2F%2Flocal.com%2Fcallback&state=${pkce.state}&code_challenge=${pkce.codeChallenge}&code_challenge_method=S256`
    );
  });

  test("should exchange code for token", async () => {
    const mockResponse = {
      access_token: "test-access-token",
      expires_in: "30",
      scope: "openid email offline_access",
      token_type: "bearer",
    };

    const fetchSpy = jest.spyOn(window, "fetch").mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
      status: 200,
    } as any);

    localStorage.setItem(
      "auth-handshake",
      JSON.stringify({
        codeChallenge: "test-challenge",
        codeVerifier: "test-verifier",
        createdAt: new Date(),
        state: "test-state",
      })
    );

    window.location.search =
      "code=test.code&scope=openid+email+offline_access&state=test-state";

    window.location.href = `https://local.com?${window.location.search}`;

    const { result } = renderHook(() => useAuthService(), wrapper);

    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/oauth2/token", {
      body: new URLSearchParams({
        client_id: "test-client-id",
        code: "test.code",
        code_verifier: "test-verifier",
        grant_type: "authorization_code",
        redirect_uri: "https://local.com/callback",
      }),
      method: "POST",
    });

    await waitFor(() => {
      expect(result.current.authState).toEqual(
        expect.objectContaining(mockResponse)
      );
    });

    expect(localStorage.getItem("auth")).toEqual(JSON.stringify(mockResponse));
  });

  describe("should use namespace if provided", () => {
    const wrapper = {
      wrapper: ({ children }: WithChildren) => (
        <AuthProvider config={{ ...config, namespace: "my" }}>
          {children}
        </AuthProvider>
      ),
    };

    test("should redirect to auth endpoint", async () => {
      const { result } = renderHook(() => useAuthService(), wrapper);

      expect(localStorage.getItem("my.auth-handshake")).toBe(null);

      result.current.login();

      await waitFor(() => {
        expect(localStorage.getItem("my.auth-handshake")).toContain(
          "codeChallenge"
        );
      });
    });

    test("should exchange code for token", async () => {
      const mockResponse = {
        access_token: "test-access-token",
        expires_in: "30",
        scope: "openid email offline_access",
        token_type: "bearer",
      };

      jest.spyOn(window, "fetch").mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
        status: 200,
      } as any);

      localStorage.setItem(
        "my.auth-handshake",
        JSON.stringify({
          codeChallenge: "test-challenge",
          codeVerifier: "test-verifier",
          createdAt: new Date(),
          state: "test-state",
        })
      );

      window.location.href = `https://local.com?code=test.code&scope=openid+email+offline_access&state=test-state`;

      expect(localStorage.getItem("my.auth")).toBe(null);

      renderHook(() => useAuthService(), wrapper);

      await waitFor(() => {
        expect(localStorage.getItem("my.auth")).toEqual(
          JSON.stringify(mockResponse)
        );
      });
    });
  });
});
