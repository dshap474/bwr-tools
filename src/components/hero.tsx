import * as React from "react"
import { Button } from "@/components/ui/button"
import { APP_CONFIG, TOOLS } from "@/lib/constants"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <span>✨</span>
            <span className="ml-2">TypeScript-First Data Visualization</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {APP_CONFIG.name}
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {APP_CONFIG.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" asChild>
              <Link href="/plots">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ToolsSection() {
  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Choose Your Tool</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {TOOLS.map((tool, index) => (
              <div key={tool.path} className="border rounded-lg p-6 bg-card">
                <h3 className="text-xl font-semibold mb-2">{tool.name}</h3>
                <p className="text-muted-foreground mb-4">{tool.description}</p>
                <Button asChild>
                  <Link href={tool.path}>Launch {tool.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Why Choose BWR Tools?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold">Pixel-Perfect</h3>
              <p className="text-muted-foreground">Exact visual output matching Python library</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold">Lightning Fast</h3>
              <p className="text-muted-foreground">Client-side processing with WebGL acceleration</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold">Type Safe</h3>
              <p className="text-muted-foreground">Built with strict TypeScript</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">Ready to Start Visualizing?</h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of developers creating professional data visualizations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/plots">Start Building</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/about">Documentation</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}