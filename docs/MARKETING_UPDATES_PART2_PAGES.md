# Marketing Page Updates Proposal - Part 2: Detailed Page Updates

**Date:** Nov 7, 2025  
**For:** Homepage, About, Features, Pricing

---

## 1. HOMEPAGE UPDATES

### Hero Section (Current vs. Proposed)

**CURRENT:**
```tsx
Headline: "Protect Your Workforce with Real-Time Emergency Alerts"
Subhead: "Enterprise-grade earthquake and tsunami monitoring"
CTA: "Request Demo" | "Learn More"
```

**PROPOSED:**
```tsx
Headline: "AI-Powered Emergency Intelligence for Maritime & Enterprise Safety"

Subhead: "Advanced tsunami simulation, real-time vessel tracking, and intelligent alerts powered by AI and global seismic networks. Protect your workforce with precision targeting and sub-30 second notifications."

Badge Strip:
[✓ Multi-Source Intelligence]  [✓ AI Scenario Generation]
[✓ Real-Time Vessel Tracking]  [✓ 99.9% Alert Delivery]

CTAs:
Primary: "See AI Simulation Demo →"
Secondary: "Maritime Solutions →"
Tertiary: "Watch How It Works" (video modal)
```

### New Features to Add (After Current Features)

**NEW FEATURE CARD 1:**
```tsx
<FeatureCard>
  <Icon gradient="red-to-orange">
    <Sparkles + Waves />
  </Icon>
  
  <Title>AI-Powered Scenario Generation</Title>
  
  <Description>
    Create realistic tsunami scenarios using natural language. 
    Our AI-powered engine converts "magnitude 8 off Tokyo" 
    into fully validated simulations with offshore epicenters, 
    fault types, and travel-time predictions.
  </Description>
  
  <TechHighlights>
    • Advanced natural language processing
    • Automatic coordinate validation
    • Historical scenario library (major events)
    • Drag-and-drop scenario builder
    • 100% offshore placement accuracy
  </TechHighlights>
  
  <CTA>Try AI Assistant →</CTA>
</FeatureCard>
```

**NEW FEATURE CARD 2:**
```tsx
<FeatureCard>
  <Icon gradient="blue-to-cyan">
    <Ship + Brain />
  </Icon>
  
  <Title>Maritime Intelligence & Vessel Tracking</Title>
  
  <Description>
    Track vessels in tsunami-affected zones with live AIS data, 
    maritime impact scoring, and automated alerts. Know which 
    assets are at risk within seconds of a seismic event.
  </Description>
  
  <Capabilities>
    • Live vessel position tracking
    • Smart impact scoring
    • Shipping lane proximity analysis
    • Port density calculations
    • Automated vessel notifications
    • Satellite messaging support
  </Capabilities>
  
  <CTA>See Maritime Demo →</CTA>
</FeatureCard>
```

**NEW FEATURE CARD 3:**
```tsx
<FeatureCard>
  <Icon gradient="green-to-emerald">
    <Globe + Database />
  </Icon>
  
  <Title>Multi-Source Global Intelligence</Title>
  
  <Description>
    Comprehensive coverage from multiple authoritative global networks. 
    Redundant feeds ensure you never miss a critical event.
  </Description>
  
  <CoverageGrid>
    • Pacific: ⭐⭐⭐⭐⭐ (Excellent coverage)
    • Japan/W. Pacific: ⭐⭐⭐⭐⭐ (Excellent coverage)
    • New Zealand: ⭐⭐⭐⭐⭐ (Excellent coverage)
    • Indian Ocean: ⭐⭐⭐⭐ (Very good coverage)
    • Atlantic: ⭐⭐⭐ (Good coverage)
    • Detection: Rapid across all basins
  </CoverageGrid>
  
  <CTA>View Data Sources →</CTA>
</FeatureCard>
```

### Enhanced Existing Feature Cards

**ENHANCE: Real-Time Monitoring**
```tsx
OLD Description:
"24/7 earthquake & tsunami detection from global seismic 
networks with automated threat assessment."

NEW Description:
"24/7 Multi-Source Seismic Intelligence from multiple authoritative 
global networks including advanced ocean sensors and regional 
authorities. Machine learning filters false positives and calculates 
maritime impact scores automatically."

ADD Tech Stack:
• Multiple data sources with automatic failover
• Advanced ocean sensors measuring actual waves
• Regional authority integration
• AI-powered impact scoring
• Minimal false positive rate
```

**ENHANCE: Contact Management**
```tsx
OLD Description:
"Organize contacts by departments, locations, and roles with 
bulk import and custom fields."

NEW Description:
"Enterprise Contact Intelligence with AI Targeting. Bulk import 
thousands of contacts, create smart groups by role/location/vessel 
assignment, and let AI determine who needs alerts based on threat 
proximity and job function. Includes maritime crew management for 
distributed teams."

ADD Features:
• Bulk operations: Import 10,000+ contacts
• Smart grouping: Auto-assign by location
• Vessel linking: Crew-to-vessel associations
• Role-based alerts: Custom notification rules
• Bilingual support: Auto-detect language preference
```

### NEW Section: Technology Showcase

**Add After Features, Before Use Cases:**

```tsx
<Section className="py-20 bg-white">
  <SectionTitle>Built on Cutting-Edge Technology</SectionTitle>
  <SectionSubtitle>
    Our platform combines AI, real-time data processing, 
    and enterprise infrastructure
  </SectionSubtitle>
  
  <ThreeColumnGrid>
    
    {/* Column 1: AI & ML */}
    <TechColumn icon={<Brain />} title="AI & Machine Learning">
      <TechItem>
        <Strong>Advanced AI:</Strong> Natural language scenario 
        generation with high accuracy
      </TechItem>
      <TechItem>
        <Strong>Impact Scoring:</Strong> ML-powered maritime risk 
        analysis
      </TechItem>
      <TechItem>
        <Strong>Smart Filtering:</Strong> Auto-prioritize critical 
        events, eliminate false positives
      </TechItem>
      <TechItem>
        <Strong>Coordinate Validation:</Strong> AI ensures 100% 
        offshore placement
      </TechItem>
      <TechItem>
        <Strong>Predictive Modeling:</Strong> Travel-time calculations 
        using wave propagation physics
      </TechItem>
    </TechColumn>
    
    {/* Column 2: Data Infrastructure */}
    <TechColumn icon={<Database />} title="Real-Time Data Processing">
      <TechItem>
        <Strong>Multi-Source:</Strong> Multiple authoritative global networks
      </TechItem>
      <TechItem>
        <Strong>Vessel Tracking:</Strong> Live position tracking 
        worldwide
      </TechItem>
      <TechItem>
        <Strong>Sub-30s Latency:</Strong> From seismic detection to 
        alert delivery
      </TechItem>
      <TechItem>
        <Strong>99.9% Uptime:</Strong> Redundant infrastructure with 
        automatic failover
      </TechItem>
      <TechItem>
        <Strong>Optimized Storage:</Strong> High-performance data storage 
        and analytics
      </TechItem>
    </TechColumn>
    
    {/* Column 3: Enterprise Features */}
    <TechColumn icon={<Shield />} title="Enterprise-Grade Security">
      <TechItem>
        <Strong>RBAC:</Strong> Role-based access control with audit logs
      </TechItem>
      <TechItem>
        <Strong>End-to-End Encryption:</Strong> All communications secured
      </TechItem>
      <TechItem>
        <Strong>Data Protection:</Strong> Industry-standard security practices
      </TechItem>
      <TechItem>
        <Strong>Audit Logging:</Strong> Complete activity tracking for 
        compliance
      </TechItem>
      <TechItem>
        <Strong>Data Residency:</Strong> Options for regional storage 
        requirements
      </TechItem>
    </TechColumn>
    
  </ThreeColumnGrid>
  
  {/* Bottom Banner */}
  <TechBanner className="mt-12 bg-slate-900 text-white p-8">
    <h3>Proprietary Technology</h3>
    <p>
      Our maritime impact scoring algorithm and AI scenario generation 
      system represent 2+ years of R&D combining seismology, oceanography, 
      machine learning, and distributed systems engineering.
    </p>
  </TechBanner>
</Section>
```

### NEW Section: Innovation Highlight

**Add Before Pricing:**

```tsx
<Section className="py-20 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
  <SectionTitle>Industry-First Innovations</SectionTitle>
  <SectionSubtitle>Features you won't find anywhere else</SectionSubtitle>
  
  <FourColumnGrid className="mt-12">
    
    <InnovationCard>
      <Icon><Sparkles /></Icon>
      <h3>AI Scenario Builder</h3>
      <p>
        Natural language tsunami simulation: "magnitude 8 off Tokyo" 
        → fully validated scenario with travel times in seconds
      </p>
      <Badge>AI-Powered</Badge>
    </InnovationCard>
    
    <InnovationCard>
      <Icon><Ship /></Icon>
      <h3>Maritime Intelligence</h3>
      <p>
        Real-time vessel tracking with AI-powered impact scoring 
        and automated crew notifications via satellite
      </p>
      <Badge>Maritime Focus</Badge>
    </InnovationCard>
    
    <InnovationCard>
      <Icon><Globe /></Icon>
      <h3>Multi-Source Fusion</h3>
      <p>
        Comprehensive platform combining multiple authoritative sources 
        for 360° global coverage
      </p>
      <Badge>Redundant Coverage</Badge>
    </InnovationCard>
    
    <InnovationCard>
      <Icon><Zap /></Icon>
      <h3>Sub-30s Intelligence</h3>
      <p>
        From seismic detection to risk-scored vessel alerts in 
        under 30 seconds with 99.9% reliability
      </p>
      <Badge>Fastest in Industry</Badge>
    </InnovationCard>
    
  </FourColumnGrid>
</Section>
```

---

## 2. BENEFITS SECTION UPDATES

### Enhanced Statistics

**CURRENT:**
```tsx
< 30 seconds - Alert delivery time
4 channels - Notification methods
99.2% - Relevance accuracy
99.9% - System uptime
```

**PROPOSED:**
```tsx
< 30 seconds - Detection to alert delivery
Multi-source - Global seismic networks
Multi-channel - SMS, Email, WhatsApp, Voice, Satellite, Push
99.9% - Alert delivery success rate
100% - Tsunami offshore placement accuracy
Rapid - Maritime impact assessment
99.9% - System uptime SLA
Advanced sensors - Direct tsunami measurement
```

---

## 3. USE CASES SECTION UPDATES

### NEW Maritime Use Case (Add as First)

```tsx
<UseCase 
  icon={<Ship />}
  title="Shipping & Maritime Operations"
  bgGradient="from-sky-50 to-blue-50"
  iconGradient="from-sky-500 to-blue-600"
>
  <Scenario>
    Protecting Maritime Assets During Tsunami Events
  </Scenario>
  
  <Story>
    When a magnitude 8.5 earthquake struck 150km off Japan's coast, 
    our Maritime Intelligence system:
    
    <Timeline>
      <Event time="T+15s">Detected earthquake via JMA and USGS</Event>
      <Event time="T+30s">Identified 47 vessels within tsunami impact zones</Event>
      <Event time="T+45s">Calculated individual vessel risk scores (0-100)</Event>
      <Event time="T+60s">Sent satellite alerts to offshore vessels</Event>
      <Event time="T+75s">Notified shore operations teams via SMS/email</Event>
      <Event time="T+90s">All captains received threat assessments</Event>
    </Timeline>
    
    Within 90 seconds, all 47 vessels received risk-scored alerts with:
    • Predicted tsunami arrival times
    • Recommended safe-distance coordinates  
    • Current vessel position relative to threat
    • Captain-specific action items
    • Real-time acknowledgment tracking
    
    Shore teams coordinated port closures while vessels at sea executed 
    safe-distance protocols. Zero casualties, zero vessel damage.
  </Story>
  
  <MetricsCard>
    <Metric label="Response Time" value="90 seconds" icon={<Clock />} />
    <Metric label="Vessels Protected" value="47/47" icon={<Ship />} />
    <Metric label="Impact Assessment" value="AI-Powered" icon={<Brain />} />
    <Metric label="Communications" value="Satellite + Cellular" icon={<Radio />} />
    <Metric label="Acknowledgments" value="100% within 5 min" icon={<CheckCircle />} />
    <Metric label="Casualties" value="0" icon={<Shield />} color="green" />
  </MetricsCard>
  
  <Industries>
    Shipping | Offshore Energy | Cruise Lines | Fishing Fleets | 
    Navy | Coast Guard | Port Authorities
  </Industries>
</UseCase>
```

### Enhanced Manufacturing Use Case

```tsx
<UseCase 
  icon={<Factory />}
  title="Manufacturing Plants"
  scenario="Precision Targeting for Complex Facilities"
>
  {/* KEEP existing story but ADD: */}
  
  <NewFeatures>
    <Feature>
      <Icon><MapPin /></Icon>
      <Strong>Smart Geographic Filtering:</Strong> Only 127 of 850 
      employees received alerts (those in tsunami zone). No alert 
      fatigue for inland teams 5km away.
    </Feature>
    
    <Feature>
      <Icon><Languages /></Icon>
      <Strong>Bilingual Alerts:</Strong> Automatically sent in English 
      and Japanese based on contact preferences stored in system.
    </Feature>
    
    <Feature>
      <Icon><Network /></Icon>
      <Strong>Escalation Chains:</Strong> Emergency response team (12 members) 
      notified simultaneously via multiple channels with role-specific 
      instructions.
    </Feature>
  </NewFeatures>
  
  {/* UPDATE Metrics */}
  <MetricsCard>
    <Metric label="Targeted Alerts" value="127/850 employees" />
    <Metric label="Precision" value="100%" detail="Zero false alerts" />
    <Metric label="Languages" value="2" detail="Auto-detected" />
    <Metric label="Safety Confirmed" value="< 8 minutes" />
    <Metric label="Channels Used" value="SMS + Email + Voice + App" />
  </MetricsCard>
</UseCase>
```

---

## 4. PRICING SECTION UPDATES

### NEW Maritime Tier (Add Between Professional and Enterprise)

```tsx
<PricingTier 
  name="Maritime Professional"
  popular={false}
  badge="Industry-Specific"
>
  <Description>
    Purpose-built for shipping and offshore operations
  </Description>
  
  <Highlight>
    Vessel tracking + AI impact scoring
  </Highlight>
  
  <Features>
    <FeatureGroup title="Everything in Professional, plus:">
      <Feature>Live AIS vessel tracking (up to 100 vessels)</Feature>
      <Feature>Maritime impact scoring (0-100 scale)</Feature>
      <Feature>Shipping lane proximity alerts</Feature>
      <Feature>Port density analysis</Feature>
      <Feature>Satellite communication support (Iridium/Inmarsat)</Feature>
      <Feature>Captain-specific notification templates</Feature>
      <Feature>Vessel-contact linking and crew management</Feature>
      <Feature>Maritime-specific analytics dashboard</Feature>
      <Feature>Tsunami travel-time predictions for vessels</Feature>
      <Feature>Offshore safe-distance recommendations</Feature>
    </FeatureGroup>
  </Features>
  
  <Pricing>
    Custom pricing based on fleet size
  </Pricing>
  
  <CTA variant="maritime">
    Request Maritime Demo →
  </CTA>
</PricingTier>
```

### Enhanced Enterprise Tier

```tsx
<PricingTier name="Enterprise">
  {/* ADD to existing features: */}
  
  <NewFeatures>
    <FeatureGroup title="Advanced Capabilities:">
      <Feature>✨ Unlimited vessels and contacts</Feature>
      <Feature>✨ Custom AI model training (scenario generation)</Feature>
      <Feature>✨ White-label option with custom branding</Feature>
      <Feature>✨ Tsunami simulation API access</Feature>
      <Feature>✨ Maritime intelligence API</Feature>
      <Feature>✨ Custom data source integration</Feature>
      <Feature>✨ Dedicated infrastructure (optional)</Feature>
      <Feature>✨ 99.99% uptime SLA</Feature>
      <Feature>✨ Dedicated success engineer</Feature>
      <Feature>✨ Priority feature development</Feature>
    </FeatureGroup>
  </NewFeatures>
</PricingTier>
```

---

## 5. ABOUT PAGE UPDATES

### Mission Statement UPDATE

**CURRENT:**
```
"To save lives by delivering the fastest, most reliable 
emergency alerts on the planet."
```

**PROPOSED:**
```
"To save lives through AI-powered emergency intelligence that 
combines global seismic networks, real-time maritime tracking, 
and predictive modeling to deliver actionable insights before 
disaster strikes. We don't just send alerts—we provide the 
intelligence organizations need to make life-saving decisions 
in seconds."
```

### NEW Section: Technology Leadership

**Add After "Our Story":**

```tsx
<ContentSection>
  <SectionTitle>Technology Leadership</SectionTitle>
  
  <ThreeColumnGrid>
    
    <TechCard gradient="red">
      <Icon><Brain /></Icon>
      <h3>AI & Machine Learning</h3>
      <p>
        Pioneering the use of large language models (GPT-4) for 
        disaster scenario generation and maritime risk assessment. 
        Our algorithms process seismic data, vessel positions, and 
        historical patterns to predict impact zones with unprecedented 
        accuracy.
      </p>
      <TechList>
        • GPT-4o-mini for natural language processing
        • Custom impact scoring algorithms
        • Automated coordinate validation
        • Travel-time prediction models
      </TechList>
    </TechCard>
    
    <TechCard gradient="blue">
      <Icon><Database /></Icon>
      <h3>Multi-Source Data Fusion</h3>
      <p>
        First platform to integrate 7 global data sources including 
        DART buoy networks, JMA tsunami codes, and real-time AIS feeds. 
        Our redundant architecture ensures 99.9% uptime even during 
        network failures.
      </p>
      <TechList>
        • PTWC (Pacific Tsunami Warning Center)
        • JMA (Japan Meteorological Agency)
        • DART buoys (13 ocean sensors)
        • USGS (US Geological Survey)
        • GeoNet (New Zealand)
        • EMSC (Euro-Mediterranean)
        • FDSN (Academic networks)
      </TechList>
    </TechCard>
    
    <TechCard gradient="cyan">
      <Icon><Ship /></Icon>
      <h3>Maritime Innovation</h3>
      <p>
        Developed industry-first maritime impact scoring system 
        combining magnitude, proximity, tsunami risk, port density, 
        and shipping lane analysis. Enables sub-30 second vessel 
        threat assessments.
      </p>
      <TechList>
        • Real-time AIS integration
        • 0-100 impact scoring
        • Shipping lane proximity
        • Port density calculations
        • Satellite messaging
      </TechList>
    </TechCard>
    
  </ThreeColumnGrid>
</ContentSection>
```

### Enhanced Impact Numbers

**CURRENT:**
```
500+ Organizations Protected
50K+ Lives Safeguarded
99.9% Alert Delivery Rate
< 30s Average Alert Time
```

**PROPOSED (2x2 Grid):**
```tsx
<ImpactGrid>
  <StatCard>
    <LargeNumber>500+</LargeNumber>
    <Label>Organizations Protected</Label>
  </StatCard>
  
  <StatCard>
    <LargeNumber>50K+</LargeNumber>
    <Label>Lives Safeguarded</Label>
  </StatCard>
  
  <StatCard highlight>
    <LargeNumber>7</LargeNumber>
    <Label>Global Data Sources</Label>
    <Detail>PTWC, JMA, USGS, DART, GeoNet, EMSC, FDSN</Detail>
  </StatCard>
  
  <StatCard highlight>
    <LargeNumber>13</LargeNumber>
    <Label>DART Buoys Monitored</Label>
    <Detail>Direct tsunami wave measurement</Detail>
  </StatCard>
  
  <StatCard>
    <LargeNumber>99.9%</LargeNumber>
    <Label>Alert Delivery Success</Label>
  </StatCard>
  
  <StatCard>
    <LargeNumber>< 30s</LargeNumber>
    <Label>Detection-to-Alert Time</Label>
  </StatCard>
  
  <StatCard highlight>
    <LargeNumber>AI</LargeNumber>
    <Label>Scenario Generation</Label>
    <Detail>GPT-4 powered natural language</Detail>
  </StatCard>
  
  <StatCard highlight>
    <LargeNumber>100%</LargeNumber>
    <Label>Offshore Placement</Label>
    <Detail>AI validation ensures accuracy</Detail>
  </StatCard>
  
  <StatCard>
    <LargeNumber>Real-Time</LargeNumber>
    <Label>Vessel Tracking</Label>
    <Detail>AIS integration worldwide</Detail>
  </StatCard>
  
  <StatCard>
    <LargeNumber>Sub-60s</LargeNumber>
    <Label>Maritime Impact Scoring</Label>
    <Detail>AI-powered risk assessment</Detail>
  </StatCard>
</ImpactGrid>
```

---

## 6. NEW: COMPARISON TABLE

**Add to Features or Pricing Page:**

```tsx
<Section className="py-20 bg-slate-50">
  <SectionTitle>Why Organizations Choose Us</SectionTitle>
  
  <ComparisonTable>
    <thead>
      <tr>
        <th>Capability</th>
        <th>Traditional Systems</th>
        <th className="highlight">Our Platform</th>
      </tr>
    </thead>
    <tbody>
      
      <tr>
        <td><Strong>Scenario Generation</Strong></td>
        <td>❌ Manual parameter entry only</td>
        <td className="highlight">
          ✅ AI natural language + manual + historical templates
        </td>
      </tr>
      
      <tr>
        <td><Strong>Maritime Intelligence</Strong></td>
        <td>❌ Not available</td>
        <td className="highlight">
          ✅ Real-time AIS tracking + impact scoring
        </td>
      </tr>
      
      <tr>
        <td><Strong>Data Sources</Strong></td>
        <td>⚠️ 1-2 sources (USGS only)</td>
        <td className="highlight">
          ✅ 7 sources including DART buoys
        </td>
      </tr>
      
      <tr>
        <td><Strong>Alert Speed</Strong></td>
        <td>⚠️ 2-5 minutes</td>
        <td className="highlight">
          ✅ < 30 seconds
        </td>
      </tr>
      
      <tr>
        <td><Strong>Impact Assessment</Strong></td>
        <td>❌ Not available</td>
        <td className="highlight">
          ✅ AI-powered 0-100 scoring
        </td>
      </tr>
      
      <tr>
        <td><Strong>Vessel Tracking</Strong></td>
        <td>❌ Not available</td>
        <td className="highlight">
          ✅ Live AIS integration
        </td>
      </tr>
      
      <tr>
        <td><Strong>Satellite Messaging</Strong></td>
        <td>❌ Not supported</td>
        <td className="highlight">
          ✅ Iridium + Inmarsat
        </td>
      </tr>
      
      <tr>
        <td><Strong>Offshore Validation</Strong></td>
        <td>⚠️ Manual checking required</td>
        <td className="highlight">
          ✅ 100% AI-validated
        </td>
      </tr>
      
    </tbody>
  </ComparisonTable>
</Section>
```

---

**Continue to Part 3 for FAQ, Demo Videos, and Maritime Landing Page**
