import React from 'react';
import { Link } from 'react-router-dom';
import PageTransition from './PageTransition';
import { Camera, Image } from 'lucide-react';

function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Photobooth</h1>
          <p className="text-gray-600 mb-8">Capture beautiful moments with artistic filters</p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/camera"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Start Camera
            </Link>
            <Link
              to="/gallery"
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Image className="w-5 h-5" />
              View Gallery
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default Home;