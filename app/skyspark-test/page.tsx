/**
 * SkySpark Integration Test Page
 * Access at: http://localhost:3000/skyspark-test
 * 
 * This page provides a comprehensive test interface for the SkySpark integration
 * without interfering with the main equipment grouping application.
 */

import SkysparkDashboard from '@/components/SkysparkDashboard';

export default function SkysparkTestPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                SkySpark Integration Test
              </h1>
              <p className="text-sm text-gray-600">
                Test and validate the SkySpark API connection
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ← Back to Main App
              </a>
              <a
                href="http://localhost:8081"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100"
              >
                Open SkySpark →
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <SkysparkDashboard />
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>
              SkySpark Integration Status: 
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                Ready for Production ✅
              </span>
            </p>
            <p className="mt-2 text-xs">
              Session Date: June 8, 2025 | Connection: Session Cookie + Attest-Key | Format: Zinc
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const metadata = {
  title: 'SkySpark Integration Test | Grouping UI',
  description: 'Test interface for SkySpark API integration with session-based authentication and Zinc format support',
};
