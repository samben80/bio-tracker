import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // l'application vit dans un sous-dossier du dépôt : on fixe la racine du projet
  turbopack: { root: path.join(__dirname) },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
}

export default nextConfig
