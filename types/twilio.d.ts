declare module 'twilio' {
  export interface TwilioCall {
    sid: string
    status?: string
    duration?: string | null
    startTime?: Date | null
    endTime?: Date | null
    direction?: string | null
    answeredBy?: string | null
  }

  export interface TwilioMessagesApi {
    create(params: { body: string; from: string; to: string }): Promise<{ sid: string }>
  }

  export interface TwilioCallsApi {
    create(params: {
      twiml: string
      to: string
      from: string
      timeout?: number
      machineDetection?: 'Enable' | 'DetectMessageEnd' | 'Disable'
      asyncAmd?: 'true' | 'false'
    }): Promise<{ sid: string }>
    (sid: string): { fetch(): Promise<TwilioCall> }
  }

  export interface TwilioClient {
    messages: TwilioMessagesApi
    calls: TwilioCallsApi
  }

  export default function twilio(accountSid: string, authToken: string): TwilioClient
}
