import { Hero, ToolsSection, FeaturesSection, CTASection } from "@/components/hero"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <ToolsSection />
      <FeaturesSection />
      <CTASection />
    </div>
  )
}