import NextAuth, { type NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import sendgridMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { otpService } from '@/lib/services/otp-service'

const fromEmail = process.env.EMAIL_FROM ?? process.env.SENDGRID_FROM_EMAIL ?? 'no-reply@alerts.local'
const sendgridApiKey = process.env.SENDGRID_API_KEY ?? ''

if (sendgridApiKey) {
  sendgridMail.setApiKey(sendgridApiKey)
}

const smtpHost = process.env.EMAIL_SERVER_HOST ?? 'smtp.sendgrid.net'
const smtpPort = Number(process.env.EMAIL_SERVER_PORT ?? 465)
const smtpUser = process.env.EMAIL_SERVER_USER ?? 'apikey'
const smtpPassword = process.env.EMAIL_SERVER_PASSWORD ?? ''
const smtpSecure = process.env.EMAIL_SERVER_SECURE
  ? process.env.EMAIL_SERVER_SECURE === 'true'
  : smtpPort === 465

const smtpTransport = smtpPassword
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    })
  : null

if (!sendgridApiKey && !smtpTransport) {
  console.warn('⚠️ No SendGrid API key or SMTP credentials configured. Magic link emails will fail.')
}

async function sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
  const subject = 'Your Emergency Alert Command Center access link'
  const text = `Sign in to the Emergency Alert Command Center using the link below:\n\n${url}\n\nThis link expires in 10 minutes.`
  const html = `
    <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 32px;">
        <table style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="font-size: 20px; font-weight: 600; color: #0f172a;">Emergency Alert Command Center</div>
              <p style="color: #475569; font-size: 14px; margin-top: 16px;">Click the secure button below to access the operations dashboard.</p>
              <a href="${url}" style="display: inline-block; margin: 24px 0; padding: 14px 24px; background: linear-gradient(135deg, #2563eb, #06b6d4); color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 9999px;">Open Command Center</a>
              <p style="color: #94a3b8; font-size: 12px;">If you did not request this link, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  if (sendgridApiKey) {
    try {
      const [response] = await sendgridMail.send({
        to: identifier,
        from: fromEmail,
        subject,
        text,
        html
      })
      console.log('📨 Magic link email sent via SendGrid', {
        to: identifier,
        status: response?.statusCode,
        requestId: response?.headers?.['x-message-id'] ?? response?.headers?.['x-request-id']
      })
      return
    } catch (error) {
      console.error('❌ SendGrid magic link send failed', error)
      throw error
    }
  }

  if (smtpTransport) {
    try {
      const info = await smtpTransport.sendMail({
        to: identifier,
        from: fromEmail,
        subject,
        text,
        html
      })
      console.log('📨 Magic link email sent via SMTP fallback', {
        to: identifier,
        messageId: info.messageId
      })
      return
    } catch (error) {
      console.error('❌ SMTP magic link send failed', error)
      throw error
    }
  }

  throw new Error('No email transport configured')
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt' // Use JWT for credentials provider
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login'
  },
  providers: [
    EmailProvider({
      sendVerificationRequest,
      from: fromEmail
    }),
    CredentialsProvider({
      id: "otp",
      name: "SMS OTP",
      credentials: {
        phone: { 
          label: "Phone Number", 
          type: "tel",
          placeholder: "+1234567890"
        },
        code: { 
          label: "Verification Code", 
          type: "text",
          placeholder: "123456"
        }
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          throw new Error('Phone number and verification code are required')
        }

        try {
          // Verify the OTP using the existing service
          const otpResult = await otpService.verifyOtp({
            phone: credentials.phone,
            code: credentials.code
          })

          // Find or create user with the verified phone number
          let user = await prisma.user.findUnique({
            where: { phone: otpResult.phone }
          })

          if (!user) {
            // Try to find the user's name from the contacts database
            const contact = await prisma.contact.findUnique({
              where: { phone: otpResult.phone }
            })

            // Create new user if they don't exist
            user = await prisma.user.create({
              data: {
                phone: otpResult.phone,
                name: contact?.name || `Emergency Operator`, // Use contact name or default
                email: contact?.email || null // Use contact email if available
              }
            })
          } else {
            // Update user name from contacts if it's still the default format
            if (user.name?.startsWith('User •••') || !user.name || user.name === 'Emergency Operator') {
              const contact = await prisma.contact.findUnique({
                where: { phone: otpResult.phone }
              })
              
              if (contact?.name && contact.name !== user.name) {
                user = await prisma.user.update({
                  where: { id: user.id },
                  data: { 
                    name: contact.name,
                    email: contact.email || user.email
                  }
                })
              }
            }
          }

          // Return user object that NextAuth expects
          const userResult = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            image: user.image
          }

          return userResult
        } catch (error) {
          console.error('OTP authentication failed:', error)
          // Return null to indicate authentication failure
          // NextAuth will handle the error display
          return null
        }
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      // If user is provided (first time), add user data to token
      if (user) {
        token.id = user.id
        token.phone = user.phone
        token.name = user.name
        token.role = 'admin'
      }

      return token
    },
    session: async ({ session, token }) => {
      // Helper function to mask phone number
      const maskPhone = (phone: string) => {
        const digits = phone.replace(/\D/g, '')
        if (digits.length < 4) return phone
        const lastFour = digits.slice(-4)
        return `•••${lastFour}`
      }

      // Add token data to session
      if (token) {
        session.user.id = token.id as string
        session.user.phone = token.phone as string
        session.user.maskedPhone = maskPhone(token.phone as string)
        session.user.role = token.role as string || 'admin'
        
        // Use name from token or fallback to Emergency Operator
        session.user.name = (token.name as string) || 'Emergency Operator'
      }
      
      return session
    }
  }
}

const handler = NextAuth(authOptions)

export const GET = handler
export const POST = handler

export default handler
