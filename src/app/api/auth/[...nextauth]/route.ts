import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google";

// Check for environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId) {
  console.error("Missing GOOGLE_CLIENT_ID environment variable");
  throw new Error("Missing GOOGLE_CLIENT_ID environment variable");
}
if (!googleClientSecret) {
  console.error("Missing GOOGLE_CLIENT_SECRET environment variable");
  throw new Error("Missing GOOGLE_CLIENT_SECRET environment variable");
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  // Add logging for debugging
  debug: process.env.NODE_ENV === 'development',
  // Add other NextAuth options here if needed, like database integration, callbacks, etc.
  // Example callbacks:
  // callbacks: {
  //   async session({ session, token, user }) {
  //     // Send properties to the client, like an access_token and user id from a provider.
  //     session.accessToken = token.accessToken
  //     session.user.id = token.id
  //     return session
  //   }
  // }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }
