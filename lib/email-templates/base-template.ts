/**
 * Base Email Template
 * Modern, responsive email template foundation
 */

export type EmailTemplateData = {
  preheader?: string
  logoUrl?: string
  brandName?: string
  brandColor?: string
}

export function createBaseTemplate(content: string, data: EmailTemplateData = {}): string {
  const {
    preheader = '',
    logoUrl = '',
    brandName = 'Emergency Alert System',
    brandColor = '#2563eb'
  } = data

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>${brandName}</title>
    
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    
    <style>
        /* Reset styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        /* Base styles */
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
        }
        
        /* Prevent Gmail blue links */
        a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }
        
        /* Mobile styles */
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: auto !important;
            }
            .fluid {
                max-width: 100% !important;
                height: auto !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }
            .stack-column,
            .stack-column-center {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                direction: ltr !important;
            }
            .stack-column-center {
                text-align: center !important;
            }
            .center-on-narrow {
                text-align: center !important;
                display: block !important;
                margin-left: auto !important;
                margin-right: auto !important;
                float: none !important;
            }
            table.center-on-narrow {
                display: inline-block !important;
            }
            .email-padding {
                padding: 20px !important;
            }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .dark-mode-bg {
                background-color: #1f2937 !important;
            }
            .dark-mode-text {
                color: #f3f4f6 !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <!-- Preheader text -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        ${preheader}
    </div>
    
    <!-- Email wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <tr>
            <td style="padding: 20px 0;">
                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" align="center" style="margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                    
                    <!-- Logo/Brand Header -->
                    ${logoUrl ? `
                    <tr>
                        <td style="padding: 30px 40px 20px; text-align: center;">
                            <img src="${logoUrl}" alt="${brandName}" width="150" style="max-width: 150px; height: auto;">
                        </td>
                    </tr>
                    ` : `
                    <tr>
                        <td style="padding: 30px 40px 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${brandColor};">
                                ${brandName}
                            </h1>
                        </td>
                    </tr>
                    `}
                    
                    <!-- Main Content -->
                    <tr>
                        <td class="email-padding" style="padding: 0 40px 40px;">
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px;">This is an automated emergency alert.</p>
                                        <p style="margin: 0 0 10px;">Do not reply to this email.</p>
                                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                            © ${new Date().getFullYear()} ${brandName}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim()
}
