export type User = {
  id: string
  name: string
  email: string
  emailVerified?: boolean
  image?: string | null
  createdAt: string | Date
}

export type SignupInput = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export type LoginInput = {
  email: string
  password: string
}
