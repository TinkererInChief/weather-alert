declare module './email-service' {
  export class EmailService {
    constructor()
    sendEmail(request: { to: string; subject: string; html: string; text: string }): Promise<{ success: boolean; messageId?: string; error?: string; provider: string }>
    createEmergencyEmailHTML(data: { type: string; severity: number; title: string; message: string; details?: Record<string, any>; actionUrl?: string }): string
  }
}

declare module './whatsapp-service' {
  export class WhatsAppService {
    constructor()
    sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; provider: string }>
    sendTemplatedMessage(to: string, templateName: string, parameters: string[]): Promise<{ success: boolean; messageId?: string; error?: string; provider: string }>
  }
}

declare module './voice-service' {
  export class VoiceService {
    constructor()
    makeCall(to: string, message: string, options?: { language?: string; voice?: string; repeat?: number }): Promise<{ success: boolean; callId?: string; error?: string; provider: string }>
    createEmergencyVoiceMessage(data: { type: string; severity: number; location: string; magnitude?: number; waveHeight?: number; eta?: string; instructions: string }): string
  }
}

declare module './template-service' {
  export class TemplateService {
    constructor()
    renderTemplate(request: { type: string; channel: string; language: string; data: Record<string, any> }): Promise<{ content: string; subject?: string; html?: string }>
    getEmergencyInstructions(type: string, severity: number, data?: any): string
  }
}
