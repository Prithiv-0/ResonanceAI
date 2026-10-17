import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from './state/session'
import Layout from './components/Layout'
import AudioAnalysis from './pages/AudioAnalysis'
import AcousticFeatures from './pages/AcousticFeatures'
import LiveModelInference from './pages/LiveModelInference'
import ModelComparison from './pages/ModelComparison'
import NoiseRobustness from './pages/NoiseRobustness'
import KMeansAnalysis from './pages/KMeansAnalysis'
import Explainability from './pages/Explainability'
import GanAugmentation from './pages/GanAugmentation'
import Testing from './pages/Testing'
import Architecture from './pages/Architecture'

export default function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<AudioAnalysis />} />
            <Route path="/acoustic-features" element={<AcousticFeatures />} />
            <Route path="/live-model" element={<LiveModelInference />} />
            <Route path="/model-comparison" element={<ModelComparison />} />
            <Route path="/noise-robustness" element={<NoiseRobustness />} />
            <Route path="/kmeans" element={<KMeansAnalysis />} />
            <Route path="/explainability" element={<Explainability />} />
            <Route path="/gan-augmentation" element={<GanAugmentation />} />
            <Route path="/testing" element={<Testing />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </SessionProvider>
  )
}
