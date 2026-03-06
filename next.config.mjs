/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
          serverComponentsExternalPackages: ['stripe'],
    },
    images: {
          remotePatterns: [
            { protocol: 'https', hostname: '**.supabase.co' },
                ],
    },
}

export default nextConfig
