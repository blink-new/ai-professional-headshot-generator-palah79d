import { useState, useCallback } from 'react'
import { Upload, Camera, Sparkles, Download, RefreshCw, Plus, Minus } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Progress } from './ui/progress'
import { useToast } from '../hooks/use-toast'
import { blink } from '../blink/client'

type Step = 'upload' | 'customize' | 'generate' | 'results'
type Style = 'professional' | 'casual' | 'creative'

interface GeneratedImage {
  url: string
  id: string
}

export function HeadshotGenerator() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [selectedStyle, setSelectedStyle] = useState<Style>('professional')
  const [customPrompt, setCustomPrompt] = useState('')
  const [quantity, setQuantity] = useState(4)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 10MB",
          variant: "destructive"
        })
        return
      }
      
      setUploadedImage(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [toast])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 10MB",
          variant: "destructive"
        })
        return
      }
      
      setUploadedImage(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [toast])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const getStylePrompt = (style: Style): string => {
    const prompts = {
      professional: 'professional business headshot with studio lighting, clean background, formal attire, confident expression',
      casual: 'casual professional headshot with natural lighting, relaxed expression, approachable demeanor',
      creative: 'creative artistic headshot with dramatic lighting, unique composition, expressive and dynamic'
    }
    return prompts[style]
  }

  const generateHeadshots = async () => {
    if (!uploadedImage) return

    setIsGenerating(true)
    setProgress(0)
    setCurrentStep('generate')

    try {
      console.log('Starting headshot generation process...')
      setProgress(10)

      // First, upload the image to storage to get a public URL
      console.log('Uploading image to storage...')
      const { publicUrl } = await blink.storage.upload(
        uploadedImage,
        `headshots/${Date.now()}-${uploadedImage.name}`,
        { upsert: true }
      )
      
      console.log('Image uploaded to:', publicUrl)
      setProgress(30)

      // Create the prompt for transforming the uploaded photo
      const basePrompt = getStylePrompt(selectedStyle)
      const finalPrompt = customPrompt 
        ? `Transform this photo into a ${basePrompt}, ${customPrompt}. Maintain the person's facial features and identity while improving lighting, background, and overall professional appearance.` 
        : `Transform this photo into a ${basePrompt}. Maintain the person's facial features and identity while improving lighting, background, and overall professional appearance.`

      console.log('Generated prompt:', finalPrompt)
      setProgress(50)

      // Use modifyImage to transform the uploaded photo
      console.log('Starting AI image modification with uploaded photo...')
      
      const result = await blink.ai.modifyImage({
        images: [publicUrl], // Use the uploaded image URL
        prompt: finalPrompt,
        quality: 'high',
        n: quantity,
        size: '1024x1024'
      })
      
      console.log('AI modification result:', result)
      setProgress(90)

      // Convert to our format
      const images: GeneratedImage[] = result.data.map((img, index) => ({
        url: img.url,
        id: `headshot-${Date.now()}-${index}`
      }))

      console.log('Generated images:', images)
      setGeneratedImages(images)
      setProgress(100)
      setCurrentStep('results')

      toast({
        title: "Headshots generated!",
        description: `Successfully created ${quantity} professional headshots from your photo`,
      })

    } catch (error) {
      console.error('Generation error details:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate headshots. Please try again.",
        variant: "destructive"
      })
      setCurrentStep('customize')
    } finally {
      setIsGenerating(false)
    }
  }

  const regenerateHeadshots = async () => {
    await generateHeadshots()
  }

  const downloadAll = async () => {
    try {
      for (const image of generatedImages) {
        const response = await fetch(image.url)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `headshot-${image.id}.jpg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      
      toast({
        title: "Download complete",
        description: "All headshots have been downloaded",
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download images. Please try again.",
        variant: "destructive"
      })
    }
  }

  const resetGenerator = () => {
    setCurrentStep('upload')
    setUploadedImage(null)
    setPreviewUrl('')
    setSelectedStyle('professional')
    setCustomPrompt('')
    setQuantity(4)
    setGeneratedImages([])
    setProgress(0)
  }

  const stepTitles = {
    upload: 'Upload Your Photo',
    customize: 'Customize Style',
    generate: 'Generating Headshots',
    results: 'Your Professional Headshots'
  }

  const stepNumbers = {
    upload: 1,
    customize: 2,
    generate: 3,
    results: 3
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Camera className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">AI Professional Headshot Generator</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Transform your photo into professional headshots using AI
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-8 space-x-8">
            {(['upload', 'customize', 'results'] as const).map((step, index) => {
              const stepNum = index + 1
              const isActive = stepNumbers[currentStep] === stepNum
              const isCompleted = stepNumbers[currentStep] > stepNum
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium
                    ${isActive ? 'border-primary bg-primary text-primary-foreground' : 
                      isCompleted ? 'border-primary bg-primary text-primary-foreground' : 
                      'border-muted-foreground text-muted-foreground'}
                  `}>
                    {stepNum}
                  </div>
                  <span className={`ml-2 font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                  {index < 2 && (
                    <div className={`w-16 h-0.5 ml-4 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              {stepTitles[currentStep]}
            </h2>

            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="space-y-6">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-xs max-h-64 mx-auto rounded-lg object-cover"
                      />
                      <p className="text-sm text-muted-foreground">
                        Click to change image or drag a new one here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-16 w-16 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">Drop your photo here</p>
                        <p className="text-muted-foreground">or click to browse</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Supports JPG, PNG, WebP (max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex justify-center">
                  <Button
                    onClick={() => setCurrentStep('customize')}
                    disabled={!uploadedImage}
                    size="lg"
                    className="px-8"
                  >
                    Next: Customize Style
                  </Button>
                </div>
              </div>
            )}

            {/* Customize Step */}
            {currentStep === 'customize' && (
              <div className="space-y-8">
                {/* Style Selection */}
                <div>
                  <Label className="text-base font-medium mb-4 block">Choose Style</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['professional', 'casual', 'creative'] as const).map((style) => (
                      <Card
                        key={style}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedStyle === style ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedStyle(style)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="mb-2">
                            {style === 'professional' && <Sparkles className="h-8 w-8 mx-auto text-blue-500" />}
                            {style === 'casual' && <Camera className="h-8 w-8 mx-auto text-green-500" />}
                            {style === 'creative' && <Sparkles className="h-8 w-8 mx-auto text-purple-500" />}
                          </div>
                          <h3 className="font-medium capitalize">{style}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {style === 'professional' && 'Studio lighting, formal'}
                            {style === 'casual' && 'Natural, approachable'}
                            {style === 'creative' && 'Artistic, dramatic'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Custom Prompt */}
                <div>
                  <Label htmlFor="custom-prompt" className="text-base font-medium">
                    Custom Instructions (Optional)
                  </Label>
                  <Textarea
                    id="custom-prompt"
                    placeholder="Add specific details like background color, clothing, expression..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                {/* Quantity Selection */}
                <div>
                  <Label className="text-base font-medium mb-4 block">Number of Headshots</Label>
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-2xl font-bold w-12 text-center">{quantity}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      disabled={quantity >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Generate 1-10 headshots
                  </p>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('upload')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={generateHeadshots}
                    size="lg"
                    className="px-8"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Headshots
                  </Button>
                </div>
              </div>
            )}

            {/* Generate Step */}
            {currentStep === 'generate' && (
              <div className="space-y-6 text-center">
                <div className="animate-pulse-slow">
                  <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
                </div>
                <div>
                  <h3 className="text-xl font-medium mb-2">Creating your professional headshots...</h3>
                  <p className="text-muted-foreground">This may take a few moments</p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
                </div>
              </div>
            )}

            {/* Results Step */}
            {currentStep === 'results' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt="Generated headshot"
                        className="w-full aspect-square object-cover rounded-lg shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a')
                            a.href = image.url
                            a.download = `headshot-${image.id}.jpg`
                            a.click()
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={regenerateHeadshots}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={downloadAll}
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetGenerator}
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}