# BWR Plots Frontend Implementation Plan

## Analysis of Python Reference App (`@reference/bwr-plots/app.py`)

This document provides a comprehensive analysis of the Python Streamlit app and defines the implementation plan for the BWR Tools frontend application.

## Python App Structure Analysis

### Core Architecture
The Python app is a **Streamlit-based** web application with a **sidebar-main layout** that provides:
- File upload functionality (CSV/XLSX)
- Data manipulation pipeline
- Plot configuration UI
- Real-time plot generation

### Key Components Breakdown

#### 1. File Upload & Data Loading
```python
# Lines 127-167: load_data() function
- Supports CSV and XLSX files
- Auto-detection of CSV delimiters
- Explicit disabling of date parsing (parse_dates=False)
- Error handling with fallback parsing
- Caching with @st.cache_data(ttl=3600)
```

**Frontend Requirements:**
- File drag-and-drop interface ✅ (already implemented)
- CSV/XLSX parsing ✅ (already implemented)
- Progress indicators ✅ (already implemented)
- Error boundaries and validation ✅ (already implemented)

#### 2. Data Manipulation Pipeline
```python
# Lines 782-897: Phase 1 - Data Manipulation
1. Drop Columns (lines 786-795)
2. Rename Columns (lines 797-804)  
3. Pivot Data (lines 806-890)
```

**Frontend Requirements:**
- **Drop Columns UI**: Multi-select for column removal
- **Rename Columns UI**: Text inputs for each column rename
- **Pivot Operations UI**: 
  - Index column selector
  - Pivot columns selector  
  - Values column selector
  - Aggregation function selector (first, mean, sum, count, etc.)

#### 3. Plot Configuration System
```python
# Lines 573-687: Plot Configuration Section
- X-axis/Index column selection
- Date detection checkbox
- Filtering controls (Lookback vs Date Window)
- Resampling frequency (D, W, ME, QE, YE)
- Smoothing window (rolling average)
```

**Frontend Requirements:**
- **Column Selection**: Dynamic dropdowns based on current data state
- **Date Handling**: Checkbox for "Is Date?" with validation
- **Filtering Options**:
  - Radio buttons: Lookback vs Date Window
  - Number input: Lookback days
  - Date inputs: Start/End dates (DD-MM-YYYY format)
- **Resampling**: Dropdown with frequency options
- **Smoothing**: Number input for window size

#### 4. Display Information Controls
```python
# Lines 690-748: Display Info Section
- Title, Subtitle, Source text inputs
- Date override input (optional)
- Y-axis prefix/suffix
- Watermark selection (BWR branding)
- Conditional axis titles (for non-date X-axis)
```

**Frontend Requirements:**
- **Text Inputs**: Title, subtitle, source, date override
- **Prefix/Suffix**: Y-axis formatting controls
- **Watermark System**: Dropdown for SVG selection + toggle
- **Conditional Axis Titles**: Show/hide based on date checkbox

#### 5. Plot Type Management
```python
# Lines 59-98: Plot type definitions and visibility controls
PLOT_TYPES = {
    "Scatter Plot": "scatter_plot",
    "Metric Share Area Plot": "metric_share_area_plot", 
    "Bar Chart": "bar_chart",
    "Grouped Bar (Timeseries)": "multi_bar",
    "Stacked Bar (Timeseries)": "stacked_bar_chart",
    "Horizontal Bar Chart": "horizontal_bar",
    "Table (AG-Grid)": "aggrid_table"
}
```

**Frontend Requirements:**
- **Plot Type Selector**: Dropdown with all chart types ✅ (partially implemented)
- **Conditional Logic**: Different controls based on selected plot type
- **Type-Specific Features**: 
  - INDEX_REQUIRED_PLOTS for time-series
  - SMOOTHING_PLOT_TYPES for rolling averages
  - RESAMPLING_PLOT_TYPES for frequency changes

#### 6. Data Processing Pipeline
```python
# Lines 899-1118: Phase 2-3 - Data Preparation
1. Index Setting (lines 902-1016)
2. Date Conversion (lines 972-997)
3. Filtering (lines 1028-1070)
4. Resampling (lines 1071-1089)
5. Smoothing (lines 1090-1112)
```

**Frontend Requirements:**
- **Pipeline State Management**: Track processing steps
- **Real-time Validation**: Show data preview after each step
- **Error Handling**: Graceful failures with user feedback
- **Performance**: Handle large datasets efficiently

#### 7. Output Generation
```python
# Lines 1120-1271: Phase 4 - Build and Display
- Plotly chart generation with BWR theme
- AG-Grid table rendering (special case)
- HTML embedding with scrolling containers
- Download functionality for tables
```

**Frontend Requirements:**
- **Chart Rendering**: Plotly.js integration ✅ (already implemented)
- **Export Controls**: PNG/SVG/PDF downloads
- **Table Display**: AG-Grid-style data tables
- **Responsive Design**: Proper sizing and scrolling

## Key Technical Patterns to Implement

### 1. Session State Management
```python
# Python uses st.session_state for persistence
st.session_state.df = load_data(uploaded_file)
st.session_state.manipulated_df = manipulated_df
```

**Frontend Equivalent**: 
- React useState + useEffect for file/data state
- Zustand store for complex manipulation pipeline
- Local caching for expensive operations

### 2. Dynamic UI Updates
```python
# Conditional rendering based on plot type
if plot_type_display in FILTERING_PLOT_TYPES:
    # Show filtering controls
if plot_type_display in SMOOTHING_PLOT_TYPES:
    # Show smoothing controls
```

**Frontend Equivalent**:
- Conditional JSX rendering
- Dynamic form validation
- Type-safe plot configuration interfaces

### 3. Data Pipeline Architecture
```python
# Sequential processing with validation
manipulated_df = original_df.copy()
# 1. Drop columns
# 2. Rename columns  
# 3. Pivot data
# 4. Set index
# 5. Apply filters
# 6. Resample
# 7. Smooth
```

**Frontend Equivalent**:
- Immutable data transformations
- Pipeline state validation
- Step-by-step preview capability

## Frontend Implementation Plan

### Phase 5.1: Data Manipulation UI (Week 1)
1. **Drop Columns Interface**
   - Multi-select component with search
   - Real-time column list updates
   - Undo/redo functionality

2. **Rename Columns Interface**  
   - Inline editing or modal-based
   - Validation for duplicate names
   - Bulk rename operations

3. **Pivot Data Interface**
   - Step-by-step wizard
   - Preview of pivot result
   - Aggregation function selection

### Phase 5.2: Plot Configuration UI (Week 1.5)
1. **Column Selection System**
   - Dynamic dropdowns based on data state
   - Type detection indicators
   - Smart defaults (date columns, numeric columns)

2. **Filtering Controls**
   - Radio button groups
   - Date range pickers with validation
   - Lookback period slider

3. **Processing Options**
   - Resampling frequency selector
   - Smoothing controls with preview
   - Real-time data size indicators

### Phase 5.3: Display Controls & Branding (Week 2)
1. **Text Configuration**
   - Title/subtitle/source inputs
   - Date override with format validation
   - Prefix/suffix controls

2. **Watermark System**
   - SVG selector matching Python config
   - Toggle for watermark usage
   - Custom positioning options

3. **Conditional Axis Titles**
   - Show/hide based on date detection
   - Dynamic validation

### Phase 5.4: Chart Integration & Output (Week 2.5)
1. **Chart Type Selector**
   - Update existing selector with full feature set
   - Type-specific configuration panels
   - Preview capabilities

2. **Real-time Chart Generation**
   - Integration with existing chart components ✅
   - Live preview as configuration changes
   - Performance optimization for large datasets

3. **Export System**
   - PNG/SVG/PDF download buttons
   - CSV export for data tables
   - Configuration save/load

### Phase 5.5: Complete Integration (Week 3)
1. **End-to-End Workflow**
   - File upload → manipulation → configuration → generation
   - State persistence across steps
   - Error recovery mechanisms

2. **Performance Optimization**
   - Lazy loading for large datasets
   - Debounced configuration updates
   - Memory management

3. **User Experience Polish**
   - Loading states and progress indicators
   - Helpful tooltips and validation messages
   - Responsive design for different screen sizes

## Key Files to Create/Update

### New Components Needed
```
packages/shared/ui/src/data-manipulation/
├── DropColumnsSelector.tsx
├── RenameColumnsInterface.tsx
├── PivotDataWizard.tsx
└── index.ts

packages/shared/ui/src/plot-configuration/
├── ColumnSelector.tsx
├── FilterControls.tsx
├── ProcessingOptions.tsx
├── DisplayControls.tsx
├── WatermarkSelector.tsx
└── index.ts
```

### Update Existing Files
```
app/(workflows)/plots/page.tsx          # Complete workflow implementation
packages/workflows/plots/data/          # Data manipulation utilities
packages/shared/config/              # Watermark and branding config
```

## Integration with Existing Architecture

### Leverage Existing Components ✅
- **File Upload System**: Already pixel-perfect with BWR standards
- **Chart Components**: All 6 chart types implemented and tested
- **Data Processing**: DataFrame operations and date utilities
- **Type System**: Comprehensive TypeScript definitions

### New Integration Points
- **Data Pipeline**: Connect manipulation UI to DataFrame operations
- **Chart Configuration**: Bridge UI controls to chart component props
- **State Management**: Coordinate between upload, manipulation, and generation
- **Export System**: Integrate with existing PlotlyRenderer export functionality

## Success Criteria

### Functional Requirements
- [ ] Complete data manipulation pipeline (drop, rename, pivot)
- [ ] Full plot configuration matching Python app feature set
- [ ] Real-time chart generation with all 6 chart types
- [ ] Export functionality (PNG, SVG, PDF, CSV)
- [ ] Error handling and validation throughout

### Technical Requirements  
- [ ] Type-safe throughout with no `any` types
- [ ] Performance: < 100ms for configuration updates
- [ ] Memory efficient for large datasets (> 100k rows)
- [ ] Responsive design for mobile and desktop

### User Experience Requirements
- [ ] Intuitive workflow matching Python app UX patterns
- [ ] Real-time previews and validation feedback
- [ ] Graceful error recovery with helpful messages
- [ ] Consistent BWR visual standards throughout

This plan provides a comprehensive roadmap for implementing the complete BWR Plots frontend application, ensuring feature parity with the Python reference while leveraging our existing TypeScript architecture and chart implementation.