import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaCamera, FaDownload, FaSync, FaSpinner, FaTrash, FaBorderAll } from 'react-icons/fa';
import PageTransition from './PageTransition';

function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('none');
  const [collageMode, setCollageMode] = useState(false);
  const [collageLayout, setCollageLayout] = useState('2x2');

  const filters = [
    { name: 'None', value: 'none' },
    { name: 'Vintage', value: 'sepia(0.8) contrast(1.2)' },
    { name: 'B&W', value: 'grayscale(1)' },
    { name: 'Dreamy', value: 'brightness(1.2) contrast(0.8) saturate(1.5)' },
    { name: 'Warm', value: 'sepia(0.4) saturate(1.6) hue-rotate(-30deg)' },
  ];

  const collageLayouts = [
    { name: '2×2', value: '2x2', slots: 4 },
    { name: '1+2', value: '1+2', slots: 3 },
    { name: '3×1', value: '3x1', slots: 3 },
    { name: '2×1', value: '2x1', slots: 2 },
  ];

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing streams first
      stopCamera();
      setLoading(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setLoading(false);
          }).catch(error => {
            console.error("Error playing video:", error);
            setLoading(false);
          });
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Cannot access camera. Please ensure camera permissions are granted.");
      setLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;
  
      // Ensure the canvas matches the video's dimensions
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
  
      if (filter !== 'none') {
        context.filter = filter;
      }
  
      // Draw the video frame onto the canvas
      context.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
      context.filter = 'none';
  
      const photoData = canvasRef.current.toDataURL('image/jpeg', 0.9);
  
      if (collageMode) {
        // In collage mode, add to array of photos
        const layout = collageLayouts.find(l => l.value === collageLayout);
        if (photos.length < layout.slots) {
          setPhotos(prevPhotos => [...prevPhotos, { id: Date.now(), url: photoData, filter }]);
        }
      } else {
        // Save single photo to localStorage
        const savedPhotos = JSON.parse(localStorage.getItem('photos') || '[]');
        savedPhotos.push({ id: Date.now(), url: photoData });
        localStorage.setItem('photos', JSON.stringify(savedPhotos));
        // Set as current photo for single photo mode
        setPhotos([{ id: Date.now(), url: photoData, filter }]);
      }
    }
  };

  const downloadPhoto = () => {
    if (photos.length > 0) {
      if (collageMode && photos.length > 1) {
        // For collage, we need to create a combined image
        const collageCanvas = document.createElement('canvas');
        const ctx = collageCanvas.getContext('2d');
        
        // Set size based on layout
        let width, height;
        if (collageLayout === '2x2') {
          width = height = 1080; // Instagram standard size
          collageCanvas.width = width;
          collageCanvas.height = height;
          
          // Draw white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          
          const imageSize = width / 2;
          const positions = [
            [0, 0], [imageSize, 0],
            [0, imageSize], [imageSize, imageSize]
          ];
          
          photos.forEach((photo, index) => {
            if (index < 4) {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                if (photo.filter !== 'none') {
                  ctx.filter = photo.filter;
                }
                ctx.drawImage(img, positions[index][0], positions[index][1], imageSize, imageSize);
                ctx.restore();
                
                // When the last image is drawn, trigger download
                if (index === photos.length - 1) {
                  const link = document.createElement('a');
                  link.download = `collage-${Date.now()}.jpg`;
                  link.href = collageCanvas.toDataURL('image/jpeg', 0.9);
                  link.click();
                }
              };
              img.src = photo.url;
            }
          });
        } else if (collageLayout === '1+2') {
          width = 1080;
          height = 1080;
          collageCanvas.width = width;
          collageCanvas.height = height;
          
          // Draw white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          
          // Draw first image (large)
          if (photos[0]) {
            const img = new Image();
            img.onload = () => {
              ctx.save();
              if (photos[0].filter !== 'none') {
                ctx.filter = photos[0].filter;
              }
              ctx.drawImage(img, 0, 0, width, height/2);
              ctx.restore();
            };
            img.src = photos[0].url;
          }
          
          // Draw second and third images (smaller)
          const smallWidth = width / 2;
          if (photos[1]) {
            const img = new Image();
            img.onload = () => {
              ctx.save();
              if (photos[1].filter !== 'none') {
                ctx.filter = photos[1].filter;
              }
              ctx.drawImage(img, 0, height/2, smallWidth, height/2);
              ctx.restore();
            };
            img.src = photos[1].url;
          }
          
          if (photos[2]) {
            const img = new Image();
            img.onload = () => {
              ctx.save();
              if (photos[2].filter !== 'none') {
                ctx.filter = photos[2].filter;
              }
              ctx.drawImage(img, smallWidth, height/2, smallWidth, height/2);
              ctx.restore();
              
              // When all images are drawn, trigger download
              const link = document.createElement('a');
              link.download = `collage-${Date.now()}.jpg`;
              link.href = collageCanvas.toDataURL('image/jpeg', 0.9);
              link.click();
            };
            img.src = photos[2].url;
          }
        } else if (collageLayout === '3x1') {
          width = 1080;
          height = 1080;
          collageCanvas.width = width;
          collageCanvas.height = height;
          
          // Draw white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          
          const imageHeight = height / 3;
          
          photos.forEach((photo, index) => {
            if (index < 3) {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                if (photo.filter !== 'none') {
                  ctx.filter = photo.filter;
                }
                ctx.drawImage(img, 0, index * imageHeight, width, imageHeight);
                ctx.restore();
                
                // When the last image is drawn, trigger download
                if (index === photos.length - 1) {
                  const link = document.createElement('a');
                  link.download = `collage-${Date.now()}.jpg`;
                  link.href = collageCanvas.toDataURL('image/jpeg', 0.9);
                  link.click();
                }
              };
              img.src = photo.url;
            }
          });
        } else if (collageLayout === '2x1') {
          width = 1080;
          height = 540;
          collageCanvas.width = width;
          collageCanvas.height = height;
          
          // Draw white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          
          const imageWidth = width / 2;
          
          photos.forEach((photo, index) => {
            if (index < 2) {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                if (photo.filter !== 'none') {
                  ctx.filter = photo.filter;
                }
                ctx.drawImage(img, index * imageWidth, 0, imageWidth, height);
                ctx.restore();
                
                // When the last image is drawn, trigger download
                if (index === photos.length - 1) {
                  const link = document.createElement('a');
                  link.download = `collage-${Date.now()}.jpg`;
                  link.href = collageCanvas.toDataURL('image/jpeg', 0.9);
                  link.click();
                }
              };
              img.src = photo.url;
            }
          });
        }
        
        // Save collage to gallery
        const savedPhotos = JSON.parse(localStorage.getItem('photos') || '[]');
        setTimeout(() => {
          savedPhotos.push({ 
            id: Date.now(), 
            url: collageCanvas.toDataURL('image/jpeg', 0.9),
            isCollage: true 
          });
          localStorage.setItem('photos', JSON.stringify(savedPhotos));
        }, 500); // Give time for canvas to render
        
      } else {
        // For single photo, download directly
        const link = document.createElement('a');
        link.download = `photobooth-${Date.now()}.jpg`;
        link.href = photos[0].url;
        link.click();
      }
    }
  };

  const retake = () => {
    if (collageMode) {
      setPhotos([]);
    } else {
      setPhotos([]);
    }
    setFilter('none');
    startCamera();
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter(photo => photo.id !== id));
  };

  const toggleCollageMode = () => {
    setCollageMode(!collageMode);
    setPhotos([]);
  };

  const renderCollagePreview = () => {
    const layout = collageLayouts.find(l => l.value === collageLayout);
    const slots = layout ? layout.slots : 4;
    const emptySlots = Math.max(0, slots - photos.length);
    
    if (collageLayout === '2x2') {
      return (
        <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-lg overflow-hidden">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative aspect-square">
              <img 
                src={photo.url} 
                alt={`Collage part ${index+1}`}
                className="w-full h-full object-cover"
                style={{ filter: photo.filter }}
              />
              <button 
                onClick={() => removePhoto(photo.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-200 aspect-square flex items-center justify-center">
              <span className="text-gray-400 text-sm">Empty slot</span>
            </div>
          ))}
        </div>
      );
    } else if (collageLayout === '1+2') {
      return (
        <div className="bg-gray-100 rounded-lg overflow-hidden">
          <div className="relative w-full" style={{ height: '200px' }}>
            {photos[0] ? (
              <>
                <img 
                  src={photos[0].url} 
                  alt="Collage main"
                  className="w-full h-full object-cover"
                  style={{ filter: photos[0].filter }}
                />
                <button 
                  onClick={() => removePhoto(photos[0].id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Main photo</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="relative aspect-square">
              {photos[1] ? (
                <>
                  <img 
                    src={photos[1].url} 
                    alt="Collage part 2"
                    className="w-full h-full object-cover"
                    style={{ filter: photos[1].filter }}
                  />
                  <button 
                    onClick={() => removePhoto(photos[1].id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Empty slot</span>
                </div>
              )}
            </div>
            <div className="relative aspect-square">
              {photos[2] ? (
                <>
                  <img 
                    src={photos[2].url} 
                    alt="Collage part 3"
                    className="w-full h-full object-cover"
                    style={{ filter: photos[2].filter }}
                  />
                  <button 
                    onClick={() => removePhoto(photos[2].id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Empty slot</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else if (collageLayout === '3x1') {
      return (
        <div className="flex flex-col gap-1 bg-gray-100 rounded-lg overflow-hidden">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative w-full" style={{ height: '100px' }}>
              <img 
                src={photo.url} 
                alt={`Collage part ${index+1}`}
                className="w-full h-full object-cover"
                style={{ filter: photo.filter }}
              />
              <button 
                onClick={() => removePhoto(photo.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-200 w-full" style={{ height: '100px' }}>
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-sm">Empty slot</span>
              </div>
            </div>
          ))}
        </div>
      );
    } else if (collageLayout === '2x1') {
      return (
        <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-lg overflow-hidden">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative aspect-video">
              <img 
                src={photo.url} 
                alt={`Collage part ${index+1}`}
                className="w-full h-full object-cover"
                style={{ filter: photo.filter }}
              />
              <button 
                onClick={() => removePhoto(photo.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-200 aspect-video flex items-center justify-center">
              <span className="text-gray-400 text-sm">Empty slot</span>
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-teal-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Aesthetic Photobooth</h1>
            <p className="text-gray-600 text-sm">
              {collageMode ? 'Create Instagram-style photo collages' : 'Capture beautiful moments with artistic filters'}
            </p>
            <div className="flex justify-center mt-2">
              <button
                onClick={toggleCollageMode}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
                  ${collageMode 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700'}`}
              >
                <FaBorderAll className="w-3 h-3" />
                Collage Mode {collageMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            {collageMode && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Collage Layout:</p>
                <div className="flex flex-wrap gap-2">
                  {collageLayouts.map((layout) => (
                    <button
                      key={layout.value}
                      onClick={() => {
                        setCollageLayout(layout.value);
                        setPhotos([]); // Reset photos when changing layout
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                        ${collageLayout === layout.value 
                          ? 'bg-gray-800 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {layout.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Camera view area */}
            <div className="relative rounded-lg overflow-hidden bg-gray-100 mb-4">
              {loading ? (
                <div className="aspect-video flex items-center justify-center">
                  <FaSpinner className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ filter: filter }}
                  />
                </div>
              )}
            </div>
            
            {/* Collage preview area */}
            {collageMode && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Collage Preview:</p>
                {renderCollagePreview()}
              </div>
            )}
            
            {/* Single photo view */}
            {!collageMode && photos.length > 0 && (
              <div className="relative rounded-lg overflow-hidden bg-gray-100 mb-4">
                <div className="aspect-video">
                  <img 
                    src={photos[0].url} 
                    alt="Captured" 
                    className="w-full h-full object-cover"
                    style={{ filter: photos[0].filter }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setFilter(f.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${filter === f.value 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="flex justify-center gap-3">
                {collageMode ? (
                  <div className="flex gap-3">
                    <button
                      onClick={takePhoto}
                      className="flex items-center gap-1 px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors text-sm"
                      disabled={loading || (photos.length >= collageLayouts.find(l => l.value === collageLayout).slots)}
                    >
                      <FaCamera className="w-4 h-4" />
                      {`Add Photo ${photos.length}/${collageLayouts.find(l => l.value === collageLayout).slots}`}
                    </button>
                    
                    {photos.length > 0 && (
                      <>
                        <button
                          onClick={retake}
                          className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors text-sm"
                        >
                          <FaSync className="w-4 h-4" />
                          Clear All
                        </button>
                        
                        {photos.length > 1 && (
                          <button
                            onClick={downloadPhoto}
                            className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors text-sm"
                          >
                            <FaDownload className="w-4 h-4" />
                            Save Collage
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {photos.length === 0 ? (
                      <button
                        onClick={takePhoto}
                        className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
                        disabled={loading}
                      >
                        <FaCamera className="w-4 h-4" />
                        Take Photo
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={retake}
                          className="flex items-center gap-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                        >
                          <FaSync className="w-4 h-4" />
                          Retake
                        </button>
                        <button
                          onClick={downloadPhoto}
                          className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
                        >
                          <FaDownload className="w-4 h-4" />
                          Download
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-center text-gray-500 text-xs">
            <Link to="/" className="text-blue-500 hover:underline mr-4">
              Back to Home
            </Link>
            <Link to="/gallery" className="text-blue-500 hover:underline">
              View Gallery
            </Link>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </PageTransition>
  );
}

export default Camera;