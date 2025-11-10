'use client'

import { useState, useEffect } from 'react'
import { Upload, Download, Ship, AlertTriangle, CheckCircle, Activity, Database, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { formatDualTime } from '@/lib/time-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

type ImportResult = {
  imported: number
  updated: number
  skipped: number
  failed: number
  errors: string[]
  duration: number
}

type VesselStats = {
  total: number
  active: number
  withTracking: number
  trackingPercentage: number
  byType: Array<{ vesselType: string; _count: number }>
}

export default function VesselImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult | null>(null)
  const [stats, setStats] = useState<VesselStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchStats()
  }, [results])
  
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/vessels/stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }
  
  const handleImport = async () => {
    if (!file) return
    
    setImporting(true)
    setError(null)
    setResults(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source', 'manual')
      
      const response = await fetch('/api/admin/vessels/import', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Import failed')
      }
      
      setResults(data.results)
      setFile(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }
  
  const downloadTemplate = () => {
    const csvContent = [
      'IMO,MMSI,Name,Callsign,Type,Flag,Length,Width,GrossTonnage,Deadweight,BuildYear,Owner,Operator',
      'IMO1234567,123456789,MV Example Ship,ABCD,Container,US,300,40,50000,70000,2015,Example Corp,Example Shipping',
      'IMO7654321,987654321,MV Sample Vessel,EFGH,Bulk Carrier,GB,250,35,45000,65000,2018,Sample Inc,Sample Marine'
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vessel-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Global Vessel Repository</h1>
        <p className="text-slate-400 mt-2">
          Import and manage the global database of maritime vessels
        </p>
      </div>
      
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Vessels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-blue-400" />
                <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Active Vessels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-400" />
                <div className="text-3xl font-bold">{stats.active.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Live Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                <div className="text-3xl font-bold">{stats.withTracking.toLocaleString()}</div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {stats.trackingPercentage}% of total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Top Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byType.length > 0 && (
                <>
                  <div className="text-2xl font-bold">{stats.byType[0].vesselType}</div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.byType[0]._count.toLocaleString()} vessels
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* CSV Template Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-6 w-6 text-blue-400 mt-1" />
            <div className="flex-1">
              <CardTitle className="text-blue-400">CSV Import Template</CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Download the template to ensure your data is formatted correctly. 
                Required fields: IMO, Name, Type. All other fields are optional.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="border-blue-500/30 hover:bg-blue-500/10"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>
      
      {/* File Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Vessel Data</CardTitle>
          <CardDescription>
            CSV file with vessel information. Maximum file size: 10MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-600 transition-colors">
            <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              {file ? file.name : 'Choose a CSV file to upload'}
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {file 
                ? `Size: ${(file.size / 1024).toFixed(2)} KB` 
                : 'Maximum file size: 10MB'
              }
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) {
                  if (selectedFile.size > 10 * 1024 * 1024) {
                    setError('File size must be less than 10MB')
                    return
                  }
                  setFile(selectedFile)
                  setError(null)
                  setResults(null)
                }
              }}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild variant="outline">
                <span>Choose File</span>
              </Button>
            </label>
          </div>
          
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full"
            size="lg"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Vessels
              </>
            )}
          </Button>
          
          {importing && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-sm text-slate-400 text-center">
                Processing vessels... This may take a few minutes for large files.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Results Card */}
      {results && (
        <Card className="bg-slate-800/50">
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Completed in {(results.duration / 1000).toFixed(2)} seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-3xl font-bold text-green-400">
                  {results.imported}
                </div>
                <div className="text-sm text-slate-400 mt-1">Imported</div>
              </div>
              
              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-3xl font-bold text-blue-400">
                  {results.updated}
                </div>
                <div className="text-sm text-slate-400 mt-1">Updated</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="text-3xl font-bold text-yellow-400">
                  {results.skipped}
                </div>
                <div className="text-sm text-slate-400 mt-1">Skipped</div>
              </div>
              
              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-3xl font-bold text-red-400">
                  {results.failed}
                </div>
                <div className="text-sm text-slate-400 mt-1">Failed</div>
              </div>
            </div>
            
            {/* Errors */}
            {results.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({results.errors.length})
                </h4>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-1">
                    {results.errors.slice(0, 20).map((error, i) => (
                      <div key={i} className="text-sm text-slate-400 flex items-start gap-2">
                        <span className="text-red-400 flex-shrink-0">•</span>
                        <span>{error}</span>
                      </div>
                    ))}
                    {results.errors.length > 20 && (
                      <div className="text-sm text-slate-500 italic mt-2">
                        ... and {results.errors.length - 20} more errors
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Success Message */}
            {results.imported + results.updated > 0 && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <AlertDescription className="text-green-400">
                  Successfully processed {results.imported + results.updated} vessels!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
