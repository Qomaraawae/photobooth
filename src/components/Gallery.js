import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageTransition from './PageTransition';
import { Camera, ArrowLeft, Trash2, Download, X } from 'lucide-react';

function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // State to track the selected photo for full view

  useEffect(() => {
    const savedPhotos = JSON.parse(localStorage.getItem('photos') || '[]');
    setPhotos(savedPhotos);
  }, []);

  const deletePhoto = (id) => {
    const updatedPhotos = photos.filter(photo => photo.id !== id);
    setPhotos(updatedPhotos);
    localStorage.setItem('photos', JSON.stringify(updatedPhotos));
  };

  const downloadPhoto = (url) => {
    const link = document.createElement('a');
    link.download = `photo-${Date.now()}.jpg`;
    link.href = url;
    link.click();
  };

  const openFullView = (photo) => {
    setSelectedPhoto(photo); // Set the selected photo for full view
  };

  const closeFullView = () => {
    setSelectedPhoto(null); // Close the full view modal
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-teal-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Photo Gallery</h1>
            <p className="text-gray-600">Your captured moments</p>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No photos yet</p>
              <Link
                to="/camera"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Take Some Photos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden group relative cursor-pointer"
                  onClick={() => openFullView(photo)} // Open full view on photo click
                >
                  <img
                    src={photo.url}
                    alt={`Captured moment ${photo.id}`}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening full view when deleting
                      deletePhoto(photo.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening full view when downloading
                      downloadPhoto(photo.url);
                    }}
                    className="absolute bottom-2 right-2 p-2 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Full View Modal */}
          {selectedPhoto && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-3xl w-full relative">
                <img
                  src={selectedPhoto.url}
                  alt={`Full view ${selectedPhoto.id}`}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-t-lg"
                />
                <div className="p-4 flex justify-end gap-2">
                  <button
                    onClick={() => downloadPhoto(selectedPhoto.url)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => deletePhoto(selectedPhoto.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    onClick={closeFullView}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-blue-500 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default Gallery;