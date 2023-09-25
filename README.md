# PKCE React Auth Library

Zero dependency authorization Code Flow with PKCE.

This library provides a simple and easy-to-use React hook for implementing PKCE
(Proof Key for Code Exchange) authentication with an OAuth2 server.

## Installation

To install the library, run:

```
npm install pkce-hook
```

or

```
yarn add pkce-hook
```

## Usage

The library exposes an `AuthProvider` component that wraps your app and provides
the `useAuthService` hook for authenticating with an OAuth2 server using the PKCE flow.

Here's an example of how to use the `AuthProvider` and `useAuthService`:

```jsx
import React from "react";
import { AuthProvider, useAuthService } from "pkce-hook";

function App() {
  const authService = useAuthService();

  // Render your app...
}

export default function WrappedApp() {
  const authOptions = {
    authorizeEndpoint: "AUTHORIZATION_SERVER_LOGIN_URL",
    tokenEndpoint: "AUTHORIZATION_SERVER_TOKEN_URL",
    logoutEndpoint: "AUTHORIZATION_SERVER_LOGOUT_URL",
    autoRefresh: true,
    provider: "AUTHORIZATION_SERVER_BASE_URL",
    clientId: "YOUR_CLIENT_ID",
    redirectUri: "YOUR_REDIRECT_URI",
    scopes: ["openid", "profile", "email"],
    namespace: "APP_NAME",
  };

  return (
    <AuthProvider authOptions={authOptions}>
      <App />
    </AuthProvider>
  );
}
```

### AuthProvider

In the example above, the **AuthProvider** component is wrapping the `App`
component and providing the `useAuthService` hook.

The `authOptions` prop is required and should be an object containing the
required properties provided by your OAuth2 server:

- `provider`
- `clientId`
- `redirectUri`
- `scope`

As well as optional properties:

- `authorizeEndpoint`
- `tokenEndpoint`
- `logoutEndpoint`
- `autoRefresh`
- `namespace`

**namespace** config is useful in case of multiple micro-frontend apps are using
different authorization mechanisms and have conflicting keys in local storage.

### useAuthService

The **useAuthService** hook returns an object with the following properties:

- `isAuthenticated`: A boolean indicating whether the user is authenticated.
- `isPending`: A boolean indicating whether authentication is in progress.
- `authState`: The authentication tokens returned by the OAuth2 server.
- `login`: A function to initiate the PKCE flow and authenticate the user.
- `logout`: A function to log the user out and clear the access and refresh tokens.

You can use these properties and functions to authenticate the user, access
protected resources, and manage the user's authentication state.
