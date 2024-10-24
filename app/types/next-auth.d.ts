import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      username: string
      apiKey: string
      isAdmin: boolean
    }
  }

  interface User {
    username?: string
    apiKey?: string
    isAdmin?: boolean
  }
}
