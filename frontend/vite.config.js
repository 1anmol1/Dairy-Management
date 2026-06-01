import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Icons
          'vendor-icons': ['lucide-react'],
          // Auth pages
          'chunk-auth': [
            './src/pages/auth/OwnerLogin.jsx',
            './src/pages/auth/StaffLogin.jsx',
            './src/pages/auth/AdminLogin.jsx',
          ],
          // Superadmin pages
          'chunk-superadmin': [
            './src/pages/superadmin/Dashboard.jsx',
            './src/pages/superadmin/Owners.jsx',
            './src/pages/superadmin/Plans.jsx',
            './src/pages/superadmin/Requests.jsx',
            './src/pages/superadmin/Activities.jsx',
          ],
          // Owner pages
          'chunk-owner': [
            './src/pages/owner/Dashboard.jsx',
            './src/pages/owner/Customers.jsx',
            './src/pages/owner/Staff.jsx',
            './src/pages/owner/Logs.jsx',
            './src/pages/owner/Billing.jsx',
            './src/pages/owner/DailyCollection.jsx',
            './src/pages/owner/WhatsApp.jsx',
            './src/pages/owner/DefaultRate.jsx',
            './src/pages/owner/Upgrade.jsx',
            './src/pages/owner/MessageTemplates.jsx',
            './src/pages/owner/Onboarding.jsx',
          ],
          // Landing pages
          'chunk-landing': [
            './src/pages/landing/Landing.jsx',
            './src/pages/landing/Features.jsx',
            './src/pages/landing/Pricing.jsx',
            './src/pages/landing/FAQ.jsx',
            './src/pages/landing/HowItWorks.jsx',
            './src/pages/landing/TrialSignup.jsx',
            './src/pages/landing/Privacy.jsx',
            './src/pages/landing/Terms.jsx',
          ],
        }
      }
    }
  },
  server: {
    port: 5173,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    historyApiFallback: true,
  }
});
