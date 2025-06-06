React Recipe Management Tool - Development Prompt
Project Overview
Create a React application for managing a complex sci-fi crafting recipe system. The tool will help organize 145+ final ingredients and their complete production chains, ensuring every recipe traces back to raw planetary resources.
Core Requirements
1. Data Management

CSV Upload: Parse CSV with headers: OutputID, OutputName, OutputType, OutputTier, ConstructionTime, PlanetTypes, Factions, ResourceType, FunctionalPurpose, UsageCategory, ProductionSteps, Ingredient1, Quantity1, Ingredient2, Quantity2, ... Ingredient9, Quantity9
Component Library: Import and parse markdown file containing categorized component definitions
Data Persistence: Save progress locally and export finalized recipes to CSV format

2. Recipe Management Interface

Recipe Editor: Form interface supporting up to 9 ingredients with quantities
Status Tracking: Visual indicators for "Complete," "In Progress," "Not Started" recipes
Finalization System: Mark recipes as finalized to lock them and move to next dependency level
Search & Filter: Find items by name, type, tier, completion status, or category

3. Dependency Chain Validation

Chain Visualization: Show complete production chain from final product → components → raw resources
Gap Detection: Identify missing recipes that break the production chain
Circular Dependency Detection: Prevent recipes that reference themselves
Raw Resource Validation: Ensure all chains terminate at valid raw resources

4. Smart Suggestions System

Component Suggestions: Recommend appropriate components based on:

Item tier (T1-T5 appropriate materials)
Functional purpose (ENERGY_MATERIAL, STRUCTURAL_ALLOY, etc.)
Resource type compatibility
Thematic consistency (weapon parts, electronics, bio-tech, etc.)


Auto-complete: Type-ahead search for ingredient names
Recipe Templates: Suggest common patterns (Metal Ore → Metal, Complex Assembly patterns)

5. Categorization & Organization

Category Filters: Group by OutputType (INGREDIENT, COMPONENT, RAW_RESOURCE)
Tier Organization: Separate T1-T5 items for logical progression
Functional Grouping: Organize by purpose (Weapon Systems, Electronics, Propulsion, etc.)
Completion Dashboard: Overview showing progress across all categories

Technical Specifications
Frontend Framework

React 18+ with functional components and hooks
Javascript for scripting
CSS classes for styling
React Hook Form for form management
React Table or TanStack Table for data grids

Key Features to Implement
Data Structures
typescriptinterface Recipe {
  outputId: string;
  outputName: string;
  outputType: 'INGREDIENT' | 'COMPONENT' | 'RAW_RESOURCE';
  outputTier: number;
  constructionTime: number;
  planetTypes: string;
  factions: string;
  resourceType: string;
  functionalPurpose: string;
  usageCategory: string;
  productionSteps: number;
  ingredients: Array<{
    name: string;
    quantity: number;
  }>;
  isFinalized: boolean;
  completionStatus: 'complete' | 'partial' | 'missing';
}

interface Component {
  name: string;
  category: string;
  description: string;
  suggestedTier: number;
  ingredients: string[];
  functionalPurpose: string[];
}
Core Components

CSV Uploader - Drag & drop CSV parsing
Recipe Editor Modal - Form for editing individual recipes
Dependency Tree Viewer - Interactive visualization of production chains
Suggestion Engine - Smart component recommendations
Progress Dashboard - Overview of completion status
Export Manager - Generate and download updated CSV

State Management

Use Zustand or Redux Toolkit for global state
Persist data in localStorage with periodic backups
Handle undo/redo for recipe modifications

Validation Logic

Verify all ingredients exist in the system
Check tier progression (higher tier items can't require lower availability)
Validate resource type compatibility
Ensure production chains don't exceed reasonable depth

Smart Suggestions Algorithm
typescriptfunction getSuggestions(item: Recipe): Component[] {
  // Filter by tier compatibility
  // Match functional purpose
  // Consider thematic consistency
  // Rank by usage patterns
  // Return top 10 suggestions
}
User Workflow
Phase 1: Data Import

Upload existing CSV with 145 ingredients and raw resources
Import component library from markdown file
System analyzes current state and identifies gaps

Phase 2: Recipe Creation

Select ingredient needing a recipe
View smart suggestions based on item properties
Add ingredients with quantities (up to 9)
Validate recipe doesn't create circular dependencies
Save as draft or finalize

Phase 3: Chain Completion

System identifies new components needing recipes
Repeat recipe creation for all components
Validate complete chains back to raw resources
Mark entire chains as finalized

Phase 4: Export

Generate updated CSV with all finalized recipes
Provide validation report showing completion status
Export component library updates

UI/UX Requirements
Dashboard View

Progress bars showing completion by category
Quick access to incomplete items
Search bar with advanced filters
Recent activity log

Recipe Editor

Clean, intuitive form layout
Real-time validation feedback
Suggestion panel on the right
Dependency preview

Chain Visualizer

Interactive tree/graph showing dependencies
Color coding for completion status
Click to edit any node in the chain
Export chain diagrams

Additional Features
Quality of Life

Bulk Operations: Mark multiple recipes as finalized
Template System: Save common recipe patterns
Import/Export: Share component libraries between projects
Backup/Restore: Automatic save points
Collaboration: Export/import partial progress

Advanced Validation

Resource Utilization: Ensure all raw resources are used
Balance Checking: Identify overly complex or simple recipes
Thematic Consistency: Flag recipes that don't fit the sci-fi theme
Production Cost Analysis: Calculate resource requirements

Error Handling

Data Validation: Comprehensive CSV format checking
User Feedback: Clear error messages and suggestions
Recovery: Handle corrupted data gracefully
Performance: Optimize for large datasets (1000+ items)

Success Criteria

Successfully import existing CSV data
Create and manage 145+ ingredient recipes
Generate complete production chains to raw resources
Export finalized data in correct CSV format
Provide intuitive user experience for non-technical users
Handle complex dependency relationships without errors

Development Phases

Core Infrastructure (CSV parsing, basic data management)
Recipe Editor (Form creation, validation, suggestions)
Dependency Management (Chain visualization, gap detection)
Polish & Export (UI refinement, export functionality)

This tool will serve as the central hub for managing a complex crafting system, ensuring all 145 ingredients have complete, validated production chains while maintaining thematic consistency and game balance.