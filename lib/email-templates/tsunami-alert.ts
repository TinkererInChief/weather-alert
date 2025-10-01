import { createBaseTemplate } from './base-template'

export type TsunamiAlertData = {
  level: 'WATCH' | 'WARNING' | 'ADVISORY' | 'INFORMATION'
  location: string
  magnitude?: number
  estimatedArrival?: Date
  waveHeight?: string
  affectedAreas?: string[]
  actionUrl?: string
  mapImageUrl?: string
}

export function createTsunamiAlertEmail(data: TsunamiAlertData): { html: string; text: string; subject: string } {
  const { level, location, magnitude, estimatedArrival, waveHeight, affectedAreas, actionUrl, mapImageUrl } = data
  
  // Determine severity and colors
  const getSeverityInfo = (lvl: string) => {
    switch (lvl) {
      case 'WARNING':
        return { color: '#dc2626', bgColor: '#fee2e2', icon: '🔴', urgency: 'IMMEDIATE ACTION REQUIRED' }
      case 'WATCH':
        return { color: '#ea580c', bgColor: '#ffedd5', icon: '🟠', urgency: 'STAY ALERT' }
      case 'ADVISORY':
        return { color: '#d97706', bgColor: '#fef3c7', icon: '🟡', urgency: 'BE PREPARED' }
      default:
        return { color: '#0891b2', bgColor: '#cffafe', icon: '🔵', urgency: 'STAY INFORMED' }
    }
  }
  
  const severity = getSeverityInfo(level)
  
  const content = `
    <!-- Critical Alert Banner -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td style="padding: 24px; background: linear-gradient(135deg, ${severity.color} 0%, ${severity.color}dd 100%); border-radius: 8px; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0 0 8px; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
                    ${severity.icon} TSUNAMI ${level}
                </h1>
                <p style="margin: 0; font-size: 16px; color: #ffffff; font-weight: 600;">
                    ${severity.urgency}
                </p>
            </td>
        </tr>
    </table>
    
    <!-- Main Message -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
        <tr>
            <td>
                <p style="margin: 0 0 20px; font-size: 18px; color: #1f2937; line-height: 1.6; font-weight: 600;">
                    A tsunami ${level.toLowerCase()} has been issued for coastal areas near:
                </p>
                <p style="margin: 0 0 30px; font-size: 24px; color: ${severity.color}; font-weight: 700;">
                    📍 ${location}
                </p>
            </td>
        </tr>
    </table>
    
    <!-- Alert Details Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
            <td style="background-color: #f9fafb; border: 2px solid ${severity.color}; border-radius: 8px; padding: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1f2937;">
                    🌊 Alert Information
                </h3>
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 45%; font-size: 14px; color: #6b7280;">Alert Level</td>
                                    <td style="font-size: 14px; font-weight: 700; color: ${severity.color};">${level}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ${magnitude ? `
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 45%; font-size: 14px; color: #6b7280;">Earthquake Magnitude</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">${magnitude.toFixed(1)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    ${waveHeight ? `
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 45%; font-size: 14px; color: #6b7280;">Expected Wave Height</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">${waveHeight}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    ${estimatedArrival ? `
                    <tr>
                        <td style="padding: 8px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 45%; font-size: 14px; color: #6b7280;">Estimated Arrival</td>
                                    <td style="font-size: 14px; font-weight: 600; color: #1f2937;">
                                        ${estimatedArrival.toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          timeZoneName: 'short'
                                        })}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                </table>
            </td>
        </tr>
    </table>
    
    ${affectedAreas && affectedAreas.length > 0 ? `
    <!-- Affected Areas -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
            <td style="background-color: ${severity.bgColor}; border-left: 4px solid ${severity.color}; border-radius: 6px; padding: 20px;">
                <h4 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1f2937;">
                    📍 Affected Coastal Areas
                </h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 1.8;">
                    ${affectedAreas.map(area => `<li style="margin-bottom: 4px;">${area}</li>`).join('')}
                </ul>
            </td>
        </tr>
    </table>
    ` : ''}
    
    ${mapImageUrl ? `
    <!-- Map Image -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
            <td style="text-align: center;">
                <img src="${mapImageUrl}" alt="Tsunami alert map" width="520" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;">
            </td>
        </tr>
    </table>
    ` : ''}
    
    <!-- Critical Actions -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
            <td style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #991b1b;">
                    ⚠️ IMMEDIATE ACTIONS REQUIRED
                </h3>
                <ol style="margin: 0; padding-left: 20px; font-size: 15px; color: #7f1d1d; line-height: 1.8; font-weight: 500;">
                    <li style="margin-bottom: 12px;"><strong>MOVE TO HIGHER GROUND IMMEDIATELY</strong> - Get at least 100 feet above sea level or 2 miles inland</li>
                    <li style="margin-bottom: 12px;"><strong>DO NOT WAIT</strong> for official evacuation orders if you are in a coastal area</li>
                    <li style="margin-bottom: 12px;"><strong>STAY AWAY</strong> from beaches, harbors, and coastal areas</li>
                    <li style="margin-bottom: 12px;"><strong>LISTEN</strong> to local emergency broadcasts for updates</li>
                    <li><strong>DO NOT RETURN</strong> until authorities declare it safe</li>
                </ol>
            </td>
        </tr>
    </table>
    
    ${actionUrl ? `
    <!-- Action Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
        <tr>
            <td style="text-align: center;">
                <a href="${actionUrl}" style="display: inline-block; background-color: ${severity.color}; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    View Live Updates →
                </a>
            </td>
        </tr>
    </table>
    ` : ''}
    
    <!-- Additional Info -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 40px;">
        <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                    <strong>Note:</strong> Tsunamis can arrive in multiple waves over several hours. The first wave may not be the largest. Stay in safe areas until the all-clear is given by local authorities.
                </p>
            </td>
        </tr>
    </table>
  `
  
  const html = createBaseTemplate(content, {
    preheader: `TSUNAMI ${level}: ${location} - Take immediate action`,
    brandName: 'Emergency Alert System',
    brandColor: severity.color
  })
  
  const text = `
🌊 TSUNAMI ${level} 🌊
${severity.urgency}

Location: ${location}
${magnitude ? `Earthquake Magnitude: ${magnitude.toFixed(1)}` : ''}
${waveHeight ? `Expected Wave Height: ${waveHeight}` : ''}
${estimatedArrival ? `Estimated Arrival: ${estimatedArrival.toISOString()}` : ''}

${affectedAreas && affectedAreas.length > 0 ? `
AFFECTED AREAS:
${affectedAreas.map(area => `- ${area}`).join('\n')}
` : ''}

⚠️ IMMEDIATE ACTIONS REQUIRED:
1. MOVE TO HIGHER GROUND IMMEDIATELY (100+ feet above sea level or 2+ miles inland)
2. DO NOT WAIT for official evacuation orders if in coastal area
3. STAY AWAY from beaches, harbors, and coastal areas
4. LISTEN to local emergency broadcasts
5. DO NOT RETURN until authorities declare it safe

${actionUrl ? `View live updates: ${actionUrl}\n` : ''}

IMPORTANT: Tsunamis arrive in multiple waves over several hours. The first wave may not be the largest. Stay in safe areas until the all-clear is given.

---
This is an automated emergency alert. Do not reply to this email.
Emergency Alert System
  `.trim()
  
  const subject = `🚨 TSUNAMI ${level}: ${location} - TAKE ACTION NOW`
  
  return { html, text, subject }
}
