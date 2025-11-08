'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, MapPin, Sliders, Clock, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react'
import { quickWaterCheck } from '@/lib/utils/coordinate-validator'

type CustomScenario = {
  name: string
  description?: string
  epicenterLat: number
  epicenterLon: number
  magnitude: number
  depth?: number
  faultType?: 'thrust' | 'strike-slip' | 'normal'
  faultStrike?: number
  faultLength?: number
  faultWidth?: number
}

type CustomScenarioPanelProps = {
  onRunScenario: (scenario: CustomScenario) => void
  disabled?: boolean
}

export default function CustomScenarioPanel({ onRunScenario, disabled }: CustomScenarioPanelProps) {
  const [mode, setMode] = useState<'form' | 'ai'>('form')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isFixingCoordinates, setIsFixingCoordinates] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [epicenterLat, setEpicenterLat] = useState(35.0)
  const [epicenterLon, setEpicenterLon] = useState(140.0)
  const [magnitude, setMagnitude] = useState([7.5])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [depth, setDepth] = useState(30)
  const [faultType, setFaultType] = useState<'thrust' | 'strike-slip' | 'normal'>('thrust')
  
  // AI state
  const [aiPrompt, setAiPrompt] = useState('')
  const [generatedScenario, setGeneratedScenario] = useState<CustomScenario | null>(null)
  
  // Validation state
  const [coordinateValidation, setCoordinateValidation] = useState<{
    isValidating: boolean
    isValid: boolean
    isOverWater: boolean
    message?: string
  }>({
    isValidating: false,
    isValid: true,
    isOverWater: true
  })

  // Validate coordinates when they change
  const validateCoordinates = async (lat: number, lon: number) => {
    // Quick client-side check first
    const quickCheck = quickWaterCheck(lat, lon)
    
    if (!quickCheck) {
      setCoordinateValidation({
        isValidating: false,
        isValid: false,
        isOverWater: false,
        message: '⚠️ Coordinates appear to be over land'
      })
      return
    }
    
    // Detailed API validation
    setCoordinateValidation(prev => ({ ...prev, isValidating: true }))
    
    try {
      const response = await fetch('/api/validate-coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon })
      })
      
      const result = await response.json()
      
      setCoordinateValidation({
        isValidating: false,
        isValid: result.isValid,
        isOverWater: result.isOverWater,
        message: result.locationName 
          ? (result.isOverWater 
              ? `✓ ${result.locationName}` 
              : `⚠️ ${result.warning || 'Over land'}`)
          : result.warning || result.error
      })
    } catch (error) {
      console.error('Validation error:', error)
      setCoordinateValidation({
        isValidating: false,
        isValid: true,
        isOverWater: true,
        message: '⚠️ Unable to verify location'
      })
    }
  }

  const handleQuickRun = async () => {
    // Validate before running
    await validateCoordinates(epicenterLat, epicenterLon)
    
    const scenario: CustomScenario = {
      name: name || `M${magnitude[0]} at ${epicenterLat.toFixed(1)}°N, ${epicenterLon.toFixed(1)}°E`,
      epicenterLat,
      epicenterLon,
      magnitude: magnitude[0],
      ...(showAdvanced && {
        depth,
        faultType,
      })
    }
    onRunScenario(scenario)
  }

  const handleAIGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/parse-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Show detailed error message
        const errorMsg = data.error || data.details || 'Failed to generate scenario'
        throw new Error(errorMsg)
      }
      
      const maybeScenario = (data && (data.scenario ?? data)) as Partial<CustomScenario> | null
      
      if (
        !maybeScenario ||
        typeof maybeScenario.epicenterLat !== 'number' ||
        typeof maybeScenario.epicenterLon !== 'number' ||
        typeof maybeScenario.magnitude !== 'number'
      ) {
        const apiErr = (data && (data.error || data.details)) || 'No scenario returned from API'
        throw new Error(apiErr)
      }
      
      const scenario = maybeScenario as CustomScenario
      
      // Validate the generated coordinates
      await validateCoordinates(scenario.epicenterLat, scenario.epicenterLon)
      
      setGeneratedScenario(scenario)
    } catch (error: any) {
      console.error('AI generation failed:', error)
      
      // Show detailed error to user
      const errorMessage = error.message || 'Failed to generate scenario'
      alert(`AI Generation Error:\n\n${errorMessage}\n\nPlease try:\n• Using the manual form\n• Rephrasing your request\n• Using the Historical tab`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFixCoordinates = async () => {
    if (!generatedScenario) return
    
    setIsFixingCoordinates(true)
    try {
      // Ask AI to fix the coordinates
      const fixPrompt = `The scenario "${generatedScenario.name}" has coordinates at ${generatedScenario.epicenterLat}°, ${generatedScenario.epicenterLon}° which appear to be over land. Please suggest nearby oceanic coordinates that would be suitable for a tsunami-generating earthquake with similar characteristics. Keep the same magnitude ${generatedScenario.magnitude} and description, but move the epicenter to nearby ocean/subduction zone.`
      
      const response = await fetch('/api/ai/parse-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fixPrompt })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix coordinates')
      }
      
      const maybeFixed = (data && (data.scenario ?? data)) as Partial<CustomScenario> | null
      
      if (
        !maybeFixed ||
        typeof maybeFixed.epicenterLat !== 'number' ||
        typeof maybeFixed.epicenterLon !== 'number' ||
        typeof maybeFixed.magnitude !== 'number'
      ) {
        const apiErr = (data && (data.error || data.details)) || 'No fixed scenario returned'
        throw new Error(apiErr)
      }
      
      const fixedScenario = maybeFixed as CustomScenario
      
      // Validate the fixed coordinates
      await validateCoordinates(fixedScenario.epicenterLat, fixedScenario.epicenterLon)
      
      setGeneratedScenario(fixedScenario)
      
      // Show success message
      if (coordinateValidation.isOverWater) {
        alert(`✓ Coordinates fixed!\n\nNew location: ${fixedScenario.epicenterLat.toFixed(2)}°, ${fixedScenario.epicenterLon.toFixed(2)}°\n${coordinateValidation.message || 'Over water'}`)
      }
    } catch (error: any) {
      console.error('Failed to fix coordinates:', error)
      alert(`Failed to fix coordinates:\n\n${error.message}\n\nPlease try using the manual form to enter correct coordinates.`)
    } finally {
      setIsFixingCoordinates(false)
    }
  }

  const handleReset = () => {
    // Reset Quick Form
    setName('')
    setEpicenterLat(35.0)
    setEpicenterLon(140.0)
    setMagnitude([7.5])
    setDepth(30)
    setFaultType('thrust')
    setShowAdvanced(false)
    
    // Reset AI Assistant
    setAiPrompt('')
    setGeneratedScenario(null)
    
    // Reset validation state
    setCoordinateValidation({
      isValidating: false,
      isValid: true,
      isOverWater: true,
      message: undefined
    })
    
    // Reset other states
    setIsGenerating(false)
    setIsFixingCoordinates(false)
  }

  const historicalScenarios = [
    {
      name: '2011 Tōhoku Earthquake',
      description: 'Devastating M9.1 megathrust earthquake off Japan that triggered a catastrophic tsunami',
      epicenterLat: 38.322,
      epicenterLon: 142.369,
      magnitude: 9.1,
      depth: 29,
      faultType: 'thrust' as const
    },
    {
      name: '2004 Indian Ocean',
      description: 'M9.3 earthquake off Sumatra that caused one of the deadliest tsunamis in history',
      epicenterLat: 3.295,
      epicenterLon: 95.982,
      magnitude: 9.3,
      depth: 30,
      faultType: 'thrust' as const
    },
    {
      name: '1960 Valdivia Chile',
      description: 'The most powerful earthquake ever recorded at M9.5, generating a trans-Pacific tsunami',
      epicenterLat: -38.24,
      epicenterLon: -73.05,
      magnitude: 9.5,
      depth: 33,
      faultType: 'thrust' as const
    },
    {
      name: '2010 Chile Earthquake',
      description: 'M8.8 earthquake off Maule, Chile - 6th largest in recorded history with significant tsunami',
      epicenterLat: -36.122,
      epicenterLon: -72.898,
      magnitude: 8.8,
      depth: 35,
      faultType: 'thrust' as const
    },
    {
      name: '1964 Alaska Earthquake',
      description: 'M9.2 Great Alaska earthquake - second most powerful ever recorded, devastating local tsunami',
      epicenterLat: 61.02,
      epicenterLon: -147.65,
      magnitude: 9.2,
      depth: 25,
      faultType: 'thrust' as const
    },
    {
      name: '2011 Tōhoku (Variant)',
      description: 'Alternative simulation of the 2011 event with slightly different parameters',
      epicenterLat: 38.3,
      epicenterLon: 142.4,
      magnitude: 9.0,
      depth: 29,
      faultType: 'thrust' as const
    },
    {
      name: '1755 Lisbon Earthquake',
      description: 'Historic M8.5-9.0 earthquake off Portugal that destroyed Lisbon with massive tsunami',
      epicenterLat: 36.0,
      epicenterLon: -11.0,
      magnitude: 8.7,
      depth: 40,
      faultType: 'thrust' as const
    },
    {
      name: '1946 Aleutian Islands',
      description: 'M8.6 earthquake that generated a devastating Pacific-wide tsunami, reaching Hawaii',
      epicenterLat: 53.49,
      epicenterLon: -163.0,
      magnitude: 8.6,
      depth: 15,
      faultType: 'thrust' as const
    }
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            <CardTitle>Custom Scenario</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2"
              title="Reset all fields"
              disabled={disabled}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        {!isCollapsed && (
          <CardDescription>
            Create your own tsunami simulation with custom parameters
          </CardDescription>
        )}
      </CardHeader>
      {!isCollapsed && (
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'form' | 'ai')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="form">
              <MapPin className="w-4 h-4 mr-2" />
              Quick Form
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="historical">
              <Clock className="w-4 h-4 mr-2" />
              Historical
            </TabsTrigger>
          </TabsList>

          {/* Quick Form */}
          <TabsContent value="form" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Scenario Name (optional)</Label>
              <Input
                id="scenario-name"
                placeholder="e.g., Tokyo Bay Scenario"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude (°N)</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.1"
                  value={epicenterLat}
                  onChange={(e) => setEpicenterLat(parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lon">Longitude (°E)</Label>
                <Input
                  id="lon"
                  type="number"
                  step="0.1"
                  value={epicenterLon}
                  onChange={(e) => setEpicenterLon(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Coordinate Validation */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateCoordinates(epicenterLat, epicenterLon)}
                disabled={coordinateValidation.isValidating}
                className="w-full"
              >
                {coordinateValidation.isValidating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Validating Location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Validate Location
                  </>
                )}
              </Button>

              {coordinateValidation.message && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                  coordinateValidation.isOverWater
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
                }`}>
                  {coordinateValidation.isOverWater ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      coordinateValidation.isOverWater
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-amber-900 dark:text-amber-100'
                    }`}>
                      {coordinateValidation.message}
                    </p>
                    {!coordinateValidation.isOverWater && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Tsunamis require underwater earthquakes. Consider using coordinates over ocean.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Magnitude</Label>
                <span className="text-sm font-bold text-primary">{magnitude[0]}</span>
              </div>
              <Slider
                value={magnitude}
                onValueChange={setMagnitude}
                min={6.0}
                max={9.5}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>6.0</span>
                <span>9.5</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Parameters
            </Button>

            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="depth">Depth (km)</Label>
                  <Input
                    id="depth"
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fault-type">Fault Type</Label>
                  <Select value={faultType} onValueChange={(v: any) => setFaultType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thrust">Thrust (Most tsunamigenic)</SelectItem>
                      <SelectItem value="strike-slip">Strike-Slip</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button 
              onClick={handleQuickRun} 
              disabled={disabled}
              className="w-full"
            >
              Run Custom Scenario
            </Button>
          </TabsContent>

          {/* AI Assistant */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Describe your scenario</Label>
              <Textarea
                id="ai-prompt"
                placeholder="e.g., A massive 8.5 magnitude earthquake off the coast of California, similar to the 1906 San Francisco earthquake but offshore"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Examples:</p>
              <div className="space-y-1">
                {[
                  "A major earthquake near Tokyo similar to 2011",
                  "Magnitude 8 off the coast of Indonesia",
                  "Simulate the 1755 Lisbon earthquake"
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setAiPrompt(example)}
                    className="block text-xs text-blue-600 hover:underline"
                  >
                    • {example}
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleAIGenerate}
              disabled={disabled || isGenerating || !aiPrompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Scenario
                </>
              )}
            </Button>

            {generatedScenario && (
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950 space-y-2">
                <h4 className="font-semibold text-sm">Generated Scenario:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {generatedScenario.name}</p>
                  <p><strong>Location:</strong> {generatedScenario.epicenterLat.toFixed(2)}°N, {generatedScenario.epicenterLon.toFixed(2)}°E</p>
                  <p><strong>Magnitude:</strong> {generatedScenario.magnitude}</p>
                  {generatedScenario.description && (
                    <p className="text-xs text-muted-foreground">{generatedScenario.description}</p>
                  )}
                </div>
                
                {/* Show validation status for AI-generated coordinates */}
                {coordinateValidation.message && (
                  <div className={`p-2 rounded border ${
                    coordinateValidation.isOverWater
                      ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
                      : 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      {coordinateValidation.isOverWater ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      )}
                      <p className="text-xs flex-1">{coordinateValidation.message}</p>
                    </div>
                    
                    {/* Fix with AI button if over land */}
                    {!coordinateValidation.isOverWater && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFixCoordinates}
                        disabled={isFixingCoordinates || disabled}
                        className="w-full mt-2"
                      >
                        {isFixingCoordinates ? (
                          <>
                            <Sparkles className="w-3 h-3 mr-2 animate-spin" />
                            Fixing with AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-2" />
                            Fix with AI
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={() => onRunScenario(generatedScenario)}
                  disabled={disabled}
                  className="w-full mt-2"
                >
                  Run This Scenario
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Historical Scenarios */}
          <TabsContent value="historical" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Based on real tsunami-generating earthquakes:
            </p>
            {historicalScenarios.map((scenario) => (
              <Card key={scenario.name} className="cursor-pointer hover:bg-muted/50 transition">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{scenario.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        M{scenario.magnitude} • {scenario.epicenterLat.toFixed(1)}°, {scenario.epicenterLon.toFixed(1)}°
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {scenario.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onRunScenario(scenario)}
                      disabled={disabled}
                      className="shrink-0"
                    >
                      Run
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
      )}
    </Card>
  )
}
