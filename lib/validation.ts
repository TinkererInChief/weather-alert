import { z } from 'zod'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

// Phone number validation with international support
export const phoneNumberSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((phone) => {
    try {
      // Remove all non-digit characters except + for validation
      const cleanPhone = phone.replace(/[^\d+]/g, '')
      return isValidPhoneNumber(cleanPhone)
    } catch {
      return false
    }
  }, 'Please enter a valid phone number with country code')
  .transform((phone) => {
    // Normalize phone number to E.164 format
    const cleanPhone = phone.replace(/[^\d+]/g, '')
    const parsed = parsePhoneNumber(cleanPhone)
    return parsed?.format('E.164') || cleanPhone
  })

// OTP validation schema
export const otpSchema = z
  .string()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers')

// Contact creation/update schema
export const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
  
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  
  phone: phoneNumberSchema.optional(),
  
  whatsapp: phoneNumberSchema.optional(),
  
  language: z
    .string()
    .length(2, 'Language must be a 2-letter code')
    .regex(/^[a-z]{2}$/, 'Invalid language code')
    .default('en'),
  
  timezone: z
    .string()
    .min(1, 'Timezone is required')
    .max(50, 'Invalid timezone')
    .default('UTC'),
  
  elevationMeters: z
    .number()
    .min(-500, 'Elevation cannot be below -500m')
    .max(10000, 'Elevation cannot be above 10000m')
    .optional(),
  
  isCoastalResident: z.boolean().default(false),
  
  notificationChannels: z
    .array(z.enum(['sms', 'email', 'whatsapp', 'voice']))
    .min(1, 'At least one notification channel is required')
    .default(['sms']),
  
  active: z.boolean().default(true),
})

// Alert creation schema
export const alertSchema = z.object({
  type: z.enum(['earthquake', 'tsunami', 'test'], {
    errorMap: () => ({ message: 'Alert type must be earthquake, tsunami, or test' })
  }),
  
  severity: z
    .number()
    .int()
    .min(1, 'Severity must be between 1 and 5')
    .max(5, 'Severity must be between 1 and 5'),
  
  data: z.object({
    magnitude: z.number().min(0).max(10).optional(),
    location: z.string().min(1, 'Location is required').max(200),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    depth: z.number().min(0).max(1000).optional(),
    timestamp: z.string().datetime().optional(),
    tsunamiLevel: z.enum(['INFORMATION', 'WATCH', 'ADVISORY', 'WARNING']).optional(),
    instructions: z.string().max(500).optional(),
  }),
  
  targetChannels: z
    .array(z.enum(['sms', 'email', 'whatsapp', 'voice']))
    .min(1, 'At least one target channel is required')
    .optional(),
})

// User authentication schema
export const userAuthSchema = z.object({
  phone: phoneNumberSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
})

// API request schemas for different endpoints
export const apiRequestSchemas = {
  // OTP request schema
  otpRequest: z.object({
    phone: phoneNumberSchema,
    captchaToken: z.string().min(1, 'CAPTCHA verification required').optional()
  }),

  // OTP verification schema  
  otpVerify: z.object({
    phone: phoneNumberSchema,
    otp: otpSchema,
    captchaToken: z.string().min(1, 'CAPTCHA verification required').optional()
  }),

  // Contact management
  createContact: contactSchema,
  updateContact: contactSchema.partial().extend({
    id: z.string().cuid('Invalid contact ID'),
  }),

  // Alert sending
  sendAlert: alertSchema,

  // Test endpoints
  testNotification: z.object({
    contactId: z.string().cuid('Invalid contact ID'),
    channel: z.enum(['sms', 'email', 'whatsapp', 'voice']),
    message: z.string().min(1).max(1000),
  }),
}

// Generic API response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
})

// Validation helper functions
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
      return { success: false, errors }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

// Sanitization helpers
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

export function sanitizePhoneNumber(phone: string): string {
  // Remove all characters except digits, +, spaces, parentheses, and hyphens
  return phone.replace(/[^\d+\s()\-]/g, '')
}

// Content filtering for emergency messages
export function validateEmergencyContent(content: string): { valid: boolean; reason?: string } {
  const forbidden = [
    'hack', 'exploit', 'spam', 'scam', 'fraud',
    'bitcoin', 'crypto', 'investment', 'money',
    'click here', 'call now', 'urgent offer'
  ]
  
  const lowerContent = content.toLowerCase()
  
  for (const word of forbidden) {
    if (lowerContent.includes(word)) {
      return { valid: false, reason: `Content contains forbidden word: ${word}` }
    }
  }
  
  // Check for excessive capitalization (potential spam)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
  if (capsRatio > 0.5) {
    return { valid: false, reason: 'Excessive capitalization detected' }
  }
  
  return { valid: true }
}

// Request size validation middleware helper
export function validateRequestSize(maxSizeKB: number = 100) {
  return (request: Request): boolean => {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024
      return sizeKB <= maxSizeKB
    }
    return true
  }  
}
