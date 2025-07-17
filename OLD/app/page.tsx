import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      <h1 className="title">BWR Tools</h1>
      <p className="subtitle">Professional Research Platform</p>
      <p className="description">
        Create publication-ready charts and analyze financial data with tools designed by Blockworks Research for institutional-grade analysis.
      </p>
      
      <div>
        <a href="/workflows/plots" className="button">
          Start Creating Charts
        </a>
      </div>
      
      <div className="footer">
        <p>2024 Blockworks Research. Built for professional financial analysis.</p>
      </div>
    </>
  );
}