export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">About BWR Tools</h1>
      <div className="space-y-4">
        <p className="text-lg text-muted-foreground">
          BWR Tools is a TypeScript-only plotting application that produces 
          pixel-perfect visual output matching the Python bwr_plots library.
        </p>
        <p>
          Built with modern web technologies including Next.js 15, TypeScript, 
          Tailwind CSS, and shadcn/ui components for a professional and 
          scalable development experience.
        </p>
      </div>
    </div>
  )
}