# Tsunami Simulation Video - TTS Script

**Total Duration: 1 minute 42 seconds (102 seconds)**

---

## Full Narration Script

### Opening (0:00 - 0:15) - 15 seconds

Welcome to our Tsunami Simulation Engine. In the next minute, you'll see how we model earthquake-generated tsunamis, assess vessel threats, and coordinate emergency response across multiple communication channels.

---

### Earthquake Parameters & Physics Model (0:15 - 0:35) - 20 seconds

We input earthquake parameters: a magnitude 8.2 event off the coast of Japan at 35.5 degrees north, 139.8 degrees east.

Our physics engine uses the Okada model for seafloor displacement, calculating initial wave amplitude based on fault type, depth, and seismic moment. The shallow water wave equation determines tsunami speed: the square root of gravity times ocean depth, reaching 800 kilometers per hour in deep ocean.

---

### Distance & Threat Calculation (0:35 - 0:55) - 20 seconds

Using the Haversine formula, we calculate great circle distance from the epicenter to each vessel in your fleet. Wave height at each location is estimated using geometric spreading and fault directivity patterns.

The system determines estimated time of arrival by dividing distance by tsunami speed, then assigns severity levels: critical for waves over 5 meters or vessels within 100 kilometers, high for 2 to 5 meter waves, and moderate or low for smaller threats.

---

### Automatic Alert Creation (0:55 - 1:17) - 22 seconds

For every vessel at risk, the system automatically creates database alerts with calculated distance, wave height, and ETA values. 

Escalation policies are selected based on severity: critical threats trigger immediate three-step escalation with SMS and email, while lower severity uses graduated response protocols. All vessel alerts, threat assessments, and escalation logs are stored for audit and analysis.

---

### Multi-Channel Notification Delivery (1:17 - 1:32) - 15 seconds

Emergency notifications are dispatched through Twilio and SendGrid APIs: SMS text messages, email alerts, and WhatsApp messages reach vessel captains and shore contacts simultaneously. The system logs delivery status for every notification sent, enabling complete response tracking and accountability.

---

### Closing (1:32 - 1:42) - 10 seconds

End-to-end tsunami simulation: physics-based modeling, automated threat assessment, and coordinated emergency response. Protect your fleet with proven science and reliable technology.

---

## Key Timing Notes

- **Total Script:** 102 seconds (1:42)
- **Pacing:** Calm, authoritative, professional tone
- **Speed:** Approximately 140-150 words per minute
- **Pauses:** Natural breaks between sections for visual comprehension

## TTS Voice Recommendations

- **Voice Type:** Professional, clear, medium pitch
- **Gender:** Male or neutral (authoritative)
- **Accent:** Neutral American or British English
- **Emotion:** Confident, informative, reassuring
- **Volume:** Consistent, clear delivery

## Production Tips

1. Add subtle background music (ambient, tech-focused)
2. Emphasize key numbers (8.2 magnitude, 5 meters, 2 minutes)
3. Sync narration with key visual moments
4. Allow 1-2 second pauses between major sections
5. Fade out music during final statement for impact
