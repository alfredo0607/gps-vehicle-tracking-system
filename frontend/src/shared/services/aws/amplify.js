import { Amplify } from "aws-amplify";
import "aws-amplify/auth"; // 👈 ESTO ES CLAVE

Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId: import.meta.env.VITE_AWS_IDENTITY_POOL_ID,
      region: import.meta.env.VITE_AWS_REGION,
      allowGuestAccess: true,
    },
  },
});
