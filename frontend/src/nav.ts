export interface NavItem {
  path: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Audio Analysis' },
  { path: '/acoustic-features', label: 'Acoustic Features' },
  { path: '/live-model', label: 'Live Model (<100M)' },
  { path: '/model-comparison', label: 'Model Comparison' },
  { path: '/noise-robustness', label: 'Noise Robustness' },
  { path: '/kmeans', label: 'K-Means Analysis' },
  { path: '/explainability', label: 'Explainability' },
  { path: '/gan-augmentation', label: 'GAN Augmentation' },
  { path: '/testing', label: 'Testing' },
  { path: '/architecture', label: 'Architecture' },
]
