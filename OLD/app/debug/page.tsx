'use client';

export default function DebugPage() {
  return (
    <div style={{ backgroundColor: 'red', padding: '20px' }}>
      <h1 style={{ color: 'white', fontSize: '24px' }}>Debug Test</h1>
      
      {/* Test 1: Tiny div */}
      <div style={{ 
        width: '10px', 
        height: '10px', 
        backgroundColor: 'yellow',
        margin: '10px 0'
      }}>
      </div>
      
      {/* Test 2: Tiny SVG with inline styles */}
      <svg 
        style={{ 
          width: '10px !important', 
          height: '10px !important',
          backgroundColor: 'blue'
        }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="white"
      >
        <circle cx="12" cy="12" r="6" />
      </svg>
      
      {/* Test 3: HTML with explicit size */}
      <div style={{
        width: '50px',
        height: '50px', 
        border: '2px solid white',
        margin: '10px 0'
      }}>
        BOX
      </div>
      
      {/* Test 4: Our problematic upload icon */}
      <svg
        style={{ 
          width: '15px !important', 
          height: '15px !important',
          stroke: 'white',
          fill: 'none',
          backgroundColor: 'green'
        }}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    </div>
  );
}