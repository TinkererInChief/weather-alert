import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      phone?: string | null
      maskedPhone?: string | null
      image?: string | null
      role?: string | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    phone?: string | null
    image?: string | null
    role?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    name?: string | null
    phone?: string | null
    role?: string | null
  }
}
