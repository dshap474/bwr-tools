/**
 * Pixel Comparison Utility for Chart Testing
 * 
 * Uses pixelmatch for comparing PNG images pixel by pixel
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ComparisonOptions {
  threshold?: number;         // Threshold for pixel difference (0-1, default 0.1)
  includeAA?: boolean;        // Include anti-aliasing differences
  alpha?: number;             // Alpha channel threshold (0-1)
  diffMask?: boolean;         // Create diff mask showing only differences
  outputDiff?: string;        // Path to save diff image
}

export interface ComparisonResult {
  match: boolean;
  diffPixels: number;
  diffPercentage: number;
  totalPixels: number;
  diffImage?: Buffer;
}

/**
 * Compare two PNG images pixel by pixel
 */
export async function compareImages(
  actualBuffer: Buffer,
  expectedBuffer: Buffer,
  options: ComparisonOptions = {}
): Promise<ComparisonResult> {
  const {
    threshold = 0.1,
    includeAA = false,
    alpha = 0.1,
    diffMask = false,
    outputDiff
  } = options;

  try {
    // Try to use pixelmatch if available
    const pixelmatch = await tryRequire('pixelmatch');
    const PNG = await tryRequire('pngjs');
    
    if (pixelmatch && PNG) {
      return await compareWithPixelmatch(
        actualBuffer,
        expectedBuffer,
        { threshold, includeAA, alpha, diffMask, outputDiff },
        pixelmatch,
        PNG.PNG
      );
    }
    
    // Try jimp as fallback
    const Jimp = await tryRequire('jimp');
    if (Jimp) {
      return await compareWithJimp(actualBuffer, expectedBuffer, threshold, outputDiff);
    }
    
    // No image comparison library available
    console.warn('No image comparison library found. Install pixelmatch + pngjs or jimp.');
    return {
      match: false,
      diffPixels: -1,
      diffPercentage: -1,
      totalPixels: -1
    };
    
  } catch (error) {
    console.error('Error comparing images:', error);
    throw error;
  }
}

/**
 * Compare images using pixelmatch library
 */
async function compareWithPixelmatch(
  actualBuffer: Buffer,
  expectedBuffer: Buffer,
  options: any,
  pixelmatch: any,
  PNG: any
): Promise<ComparisonResult> {
  // Parse PNG buffers
  const actual = PNG.sync.read(actualBuffer);
  const expected = PNG.sync.read(expectedBuffer);
  
  // Check dimensions
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return {
      match: false,
      diffPixels: -1,
      diffPercentage: 100,
      totalPixels: actual.width * actual.height,
      diffImage: undefined
    };
  }
  
  const { width, height } = actual;
  const totalPixels = width * height;
  
  // Create diff image buffer
  const diff = new PNG({ width, height });
  
  // Compare pixels
  const diffPixels = pixelmatch.default ? pixelmatch.default(
    actual.data,
    expected.data,
    diff.data,
    width,
    height,
    {
      threshold: options.threshold,
      includeAA: options.includeAA,
      alpha: options.alpha,
      diffMask: options.diffMask
    }
  ) : pixelmatch(
    actual.data,
    expected.data,
    diff.data,
    width,
    height,
    {
      threshold: options.threshold,
      includeAA: options.includeAA,
      alpha: options.alpha,
      diffMask: options.diffMask
    }
  );
  
  const diffPercentage = (diffPixels / totalPixels) * 100;
  const match = diffPercentage <= (options.threshold * 100);
  
  // Save diff image if requested
  let diffImage: Buffer | undefined;
  if (options.outputDiff) {
    diffImage = PNG.sync.write(diff);
    await fs.promises.writeFile(options.outputDiff, diffImage);
  } else {
    diffImage = PNG.sync.write(diff);
  }
  
  return {
    match,
    diffPixels,
    diffPercentage,
    totalPixels,
    diffImage
  };
}

/**
 * Compare images using jimp library
 */
async function compareWithJimp(
  actualBuffer: Buffer,
  expectedBuffer: Buffer,
  threshold: number,
  outputDiff?: string
): Promise<ComparisonResult> {
  const Jimp = await import('jimp');
  
  const actual = await Jimp.default.read(actualBuffer);
  const expected = await Jimp.default.read(expectedBuffer);
  
  // Check dimensions
  if (actual.bitmap.width !== expected.bitmap.width || 
      actual.bitmap.height !== expected.bitmap.height) {
    return {
      match: false,
      diffPixels: -1,
      diffPercentage: 100,
      totalPixels: actual.bitmap.width * actual.bitmap.height
    };
  }
  
  // Calculate difference
  const diff = Jimp.default.diff(actual, expected, threshold);
  const diffPercentage = diff.percent * 100;
  const totalPixels = actual.bitmap.width * actual.bitmap.height;
  const diffPixels = Math.round(totalPixels * diff.percent);
  
  // Save diff image if requested
  if (outputDiff) {
    await diff.image.writeAsync(outputDiff);
  }
  
  return {
    match: diffPercentage <= (threshold * 100),
    diffPixels,
    diffPercentage,
    totalPixels,
    diffImage: await diff.image.getBufferAsync(Jimp.default.MIME_PNG)
  };
}

/**
 * Try to require a module, return null if not available
 */
async function tryRequire(moduleName: string): Promise<any> {
  try {
    return await import(moduleName);
  } catch {
    return null;
  }
}

/**
 * Load image from file path
 */
export async function loadImage(imagePath: string): Promise<Buffer> {
  return await fs.promises.readFile(imagePath);
}

/**
 * Save comparison result with detailed report
 */
export async function saveComparisonReport(
  result: ComparisonResult,
  reportPath: string
): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    ...result,
    diffImage: result.diffImage ? 'Generated' : 'Not generated'
  };
  
  const reportDir = path.dirname(reportPath);
  await fs.promises.mkdir(reportDir, { recursive: true });
  await fs.promises.writeFile(
    reportPath,
    JSON.stringify(report, null, 2),
    'utf8'
  );
}

/**
 * Visual comparison helper that generates HTML report
 */
export async function generateVisualReport(
  actualPath: string,
  expectedPath: string,
  diffPath: string,
  result: ComparisonResult,
  outputPath: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Chart Comparison Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; }
        .result { 
            background: ${result.match ? '#d4edda' : '#f8d7da'}; 
            color: ${result.match ? '#155724' : '#721c24'};
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .images { display: flex; gap: 20px; flex-wrap: wrap; }
        .image-container { 
            flex: 1; 
            min-width: 400px; 
            background: white; 
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .image-container h3 { margin-top: 0; }
        .image-container img { width: 100%; height: auto; border: 1px solid #ddd; }
        .stats { margin-top: 20px; }
        .stats table { width: 100%; background: white; border-collapse: collapse; }
        .stats th, .stats td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        .stats th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Chart Pixel Comparison Report</h1>
        
        <div class="result">
            <h2>${result.match ? '✅ PASS' : '❌ FAIL'}</h2>
            <p>Difference: ${result.diffPercentage.toFixed(2)}% (${result.diffPixels} pixels)</p>
        </div>
        
        <div class="images">
            <div class="image-container">
                <h3>Expected</h3>
                <img src="${expectedPath}" alt="Expected">
            </div>
            <div class="image-container">
                <h3>Actual</h3>
                <img src="${actualPath}" alt="Actual">
            </div>
            <div class="image-container">
                <h3>Difference</h3>
                <img src="${diffPath}" alt="Difference">
            </div>
        </div>
        
        <div class="stats">
            <h3>Comparison Statistics</h3>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Total Pixels</td>
                    <td>${result.totalPixels.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Different Pixels</td>
                    <td>${result.diffPixels.toLocaleString()}</td>
                </tr>
                <tr>
                    <td>Difference Percentage</td>
                    <td>${result.diffPercentage.toFixed(4)}%</td>
                </tr>
                <tr>
                    <td>Match Status</td>
                    <td>${result.match ? 'PASS' : 'FAIL'}</td>
                </tr>
                <tr>
                    <td>Generated</td>
                    <td>${new Date().toLocaleString()}</td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
  `;
  
  await fs.promises.writeFile(outputPath, html, 'utf8');
}