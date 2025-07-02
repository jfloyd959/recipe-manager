import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RecipeProvider } from './context/RecipeContext';
import Dashboard from './components/Dashboard/Dashboard';
import RecipeEditor from './components/RecipeEditor/RecipeEditor';
import DependencyViewer from './components/DependencyViewer/DependencyViewer';
import DataUploader from './components/DataUploader/DataUploader';
import CompleteRecipeSystem from './components/CompleteRecipeSystem/CompleteRecipeSystem';
import ProductionChainBuilder from './components/ProductionChainBuilder/ProductionChainBuilder';
import ResourceBalancer from './components/ResourceBalancer/ResourceBalancer';
import BuildingManager from './components/BuildingManager/BuildingManager';
import BuildingRecipes from './components/BuildingRecipes/BuildingRecipes';
import RecipeComplexityAnalyzer from './components/RecipeComplexityAnalyzer/RecipeComplexityAnalyzer';
import Navbar from './components/Layout/Navbar';
import './App.css';

function App() {
  return (
    <RecipeProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<DataUploader />} />
              <Route path="/editor" element={<RecipeEditor />} />
              <Route path="/buildings" element={<BuildingManager />} />
              <Route path="/building-recipes" element={<BuildingRecipes />} />
              <Route path="/production-chains" element={<ProductionChainBuilder />} />
              <Route path="/resource-balancer" element={<ResourceBalancer />} />
              <Route path="/dependencies" element={<DependencyViewer />} />
              <Route path="/complete-system" element={<CompleteRecipeSystem />} />
              <Route path="/complexity-analyzer" element={<RecipeComplexityAnalyzer />} />
            </Routes>
          </main>
        </div>
      </Router>
    </RecipeProvider>
  );
}

export default App; 