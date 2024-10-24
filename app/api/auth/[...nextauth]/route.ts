import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import clientPromise from "@/lib/mongodb";
import crypto from 'crypto';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        const client = await clientPromise
        const db = client.db("llm_evaluation_system")
        
        // Check if user exists
        const existingUser = await db.collection('users').findOne({ 
          username: user.email 
        })
        
        if (!existingUser) {
          // Create new user if doesn't exist
          const apiKey = crypto.randomBytes(32).toString('hex')
          await db.collection('users').insertOne({
            username: user.email,
            apiKey,
            isAdmin: false
          })
        }
        return true
      } catch (error) {
        console.error("Error in signIn callback:", error)
        return false
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async session({ session }) {
      if (session?.user?.email) {
        const client = await clientPromise
        const db = client.db("llm_evaluation_system")
        const dbUser = await db.collection('users').findOne({ 
          username: session.user.email 
        })
        
        if (dbUser) {
          session.user = {
            ...session.user,
            apiKey: dbUser.apiKey,
            isAdmin: dbUser.isAdmin || false,
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
