import { createBaseTemplate } from './base-template'
import { formatDualTime } from '../time-display'

export type EarthquakeAlertData = {
  magnitude: number
  location: string
  depth?: number
  latitude?: number
  longitude?: number
  time: Date
  tsunamiThreat?: string
  actionUrl?: string
  mapImageUrl?: string
}

export function createEarthquakeAlertEmail(data: EarthquakeAlertData): { html: string; text: string; subject: string } {
  const { magnitude, location, depth, latitude, longitude, time, tsunamiThreat, actionUrl, mapImageUrl } = data
  
  // Determine severity and colors
  const getSeverityInfo = (mag: number) => {
    if (mag >= 7.0) return { level: 'CRITICAL', color: '#dc2626', bgColor: '#fee2e2', label: 'Major Earthquake' }
    if (mag >= 6.0) return { level: 'SEVERE', color: '#ea580c', bgColor: '#ffedd5', label: 'Strong Earthquake' }
    if (mag >= 5.0) return { level: 'MODERATE', color: '#d97706', bgColor: '#fef3c7', label: 'Moderate Earthquake' }
    return { level: 'MINOR', color: '#0891b2', bgColor: '#cffafe', label: 'Minor Earthquake' }
  }
  
  const severity = getSeverityInfo(magnitude)
  
  const content = `
    <!-- Alert Badge -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td style="padding: 20px; background-color: ${severity.bgColor}; border-left: 4px solid ${severity.color}; border-radius: 6px; margin-bottom: 30px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="vertical-align: middle;">
                            <span style="display: inline-block; background-color: ${severity.color}; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                                ${severity.level}
                            </span>
                        </td>
                        <td style="text-align: right; vertical-align: middle;">
                            ${(() => {
                              const times = formatDualTime(time, 'event', undefined, { dateStyle: 'short' })
                              return `<div style="font-size: 14px; font-weight: 600; color: #1f2937;">${times.primary}</div><div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${times.secondary}</div>`
                            })()}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Main Alert Content -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
        <tr>
            <td>
                <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                    🌍 ${severity.label} Detected
                </h2>
                
                <p style="margin: 0 0 30px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                    A magnitude <strong style="color: ${severity.color}; font-size: 18px;">${magnitude.toFixed(1)}</strong> earthquake has been detected. Please review the details below and take appropriate action.
                </p>
            </td>
        </tr>
    </table>
    
    <!-- Event Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
            <td style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1f2937;">
                    📍 Event Details
                </h3>
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 40%; font-size: 14px; color: #6b7280;">Magnitude</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">${magnitude.toFixed(1)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 40%; font-size: 14px; color: #6b7280;">Location</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">${location}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ${depth ? `
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 40%; font-size: 14px; color: #6b7280;">Depth</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">${depth.toFixed(1)} km</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    ${latitude && longitude ? `
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 40%; font-size: 14px; color: #6b7280;">Coordinates</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 8px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 40%; font-size: 14px; color: #6b7280;">Time (UTC)</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">${time.toISOString().replace('T', ' ').substring(0, 19)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    ${tsunamiThreat ? `
    <!-- Tsunami Warning -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
            <td style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="vertical-align: top; width: 40px;">
                            <span style="font-size: 24px;">🌊</span>
                        </td>
                        <td style="vertical-align: top;">
                            <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #92400e;">
                                Tsunami Alert
                            </h4>
                            <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">
                                ${tsunamiThreat}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    ` : ''}
    
    ${mapImageUrl ? `
    <!-- Map Image -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
            <td style="text-align: center;">
                <img src="${mapImageUrl}" alt="Earthquake location map" width="520" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">
            </td>
        </tr>
    </table>
    ` : ''}
    
    ${actionUrl ? `
    <!-- Action Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
        <tr>
            <td style="text-align: center;">
                <a href="${actionUrl}" style="display: inline-block; background-color: ${severity.color}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                    View Full Details →
                </a>
            </td>
        </tr>
    </table>
    ` : ''}
    
    <!-- Safety Tips -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 40px;">
        <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <h4 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1f2937;">
                    ⚠️ Safety Reminders
                </h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">Drop, Cover, and Hold On if you feel shaking</li>
                    <li style="margin-bottom: 8px;">Stay away from windows and heavy objects</li>
                    <li style="margin-bottom: 8px;">Check for injuries and damage after shaking stops</li>
                    <li>Be prepared for aftershocks</li>
                </ul>
            </td>
        </tr>
    </table>
  `
  
  const html = createBaseTemplate(content, {
    preheader: `Magnitude ${magnitude.toFixed(1)} earthquake detected - ${location}`,
    brandName: 'Emergency Alert System',
    brandColor: severity.color
  })
  
  const text = `
EARTHQUAKE ALERT - ${severity.level}

Magnitude: ${magnitude.toFixed(1)}
Location: ${location}
${depth ? `Depth: ${depth.toFixed(1)} km` : ''}
${latitude && longitude ? `Coordinates: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°` : ''}
Time: ${time.toISOString()}

${tsunamiThreat ? `TSUNAMI ALERT: ${tsunamiThreat}\n` : ''}

${actionUrl ? `View full details: ${actionUrl}\n` : ''}

SAFETY REMINDERS:
- Drop, Cover, and Hold On if you feel shaking
- Stay away from windows and heavy objects
- Check for injuries and damage after shaking stops
- Be prepared for aftershocks

---
This is an automated emergency alert. Do not reply to this email.
Emergency Alert System
  `.trim()
  
  const subject = `🚨 ${severity.level}: M${magnitude.toFixed(1)} Earthquake - ${location}`
  
  return { html, text, subject }
}
