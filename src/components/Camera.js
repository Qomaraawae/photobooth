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
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Gunakan ukuran video asli
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.filter = filter !== 'none' ? filter : 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoData = canvas.toDataURL('image/jpeg', 0.92);

    if (collageMode) {
      const layout = collageLayouts.find(l => l.value === collageLayout);
      if (photos.length < layout.slots) {
        setPhotos(prev => [...prev, { 
          id: Date.now(), 
          url: photoData, 
          filter,
          // Tambahkan info asli supaya lebih akurat
          originalWidth: video.videoWidth,
          originalHeight: video.videoHeight
        }]);
      }
    } else {
      // Single photo mode
      const savedPhotos = JSON.parse(localStorage.getItem('photos') || '[]');
      savedPhotos.unshift({ id: Date.now(), url: photoData });
      localStorage.setItem('photos', JSON.stringify(savedPhotos));
      setPhotos([{ id: Date.now(), url: photoData, filter }]);
    }
  }
};

  const downloadPhoto = () => {
  if (photos.length === 0) return;

  if (collageMode && photos.length > 1) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let canvasWidth, canvasHeight;

    // UKURAN CANVAS YANG BENAR-BENAR SESUAI LAYOUT (Instagram Standard)
    switch (collageLayout) {
      case '2x2':
      case '1+2':
        canvasWidth = 1080;
        canvasHeight = 1080;
        break;
      case '3x1':
        canvasWidth = 1080;
        canvasHeight = 1350; // Lebih realistis daripada 1440
        break;
      case '2x1':
        canvasWidth = 1080;
        canvasHeight = 540;
        break;
      default:
        canvasWidth = 1080;
        canvasHeight = 1080;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Background putih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // FUNGSI DRAW DENGAN COVER (seperti object-cover di CSS)
    const drawImageCover = (img, x, y, w, h) => {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const boxRatio = w / h;

      let sx, sy, sWidth, sHeight;

      if (imgRatio > boxRatio) {
        // Gambar lebih lebar → crop kiri-kanan
        sHeight = img.naturalHeight;
        sWidth = img.naturalHeight * boxRatio;
        sx = (img.naturalWidth - sWidth) / 2;
        sy = 0;
      } else {
        // Gambar lebih tinggi → crop atas-bawah
        sWidth = img.naturalWidth;
        sHeight = img.naturalWidth / boxRatio;
        sx = 0;
        sy = (img.naturalHeight - sHeight) / 2;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
    };

    let loadedCount = 0;
    const maxPhotos = collageLayouts.find(l => l.value === collageLayout)?.slots || 4;

    photos.slice(0, maxPhotos).forEach((photo, index) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        if (photo.filter && photo.filter !== 'none') {
          ctx.filter = photo.filter;
        }

        if (collageLayout === '2x2') {
          const size = canvasWidth / 2;
          const pos = [[0,0], [size,0], [0,size], [size,size]];
          drawImageCover(img, ...pos[index], size, size);
        }
        else if (collageLayout === '1+2') {
          if (index === 0) drawImageCover(img, 0, 0, canvasWidth, canvasHeight/2);
          if (index === 1) drawImageCover(img, 0, canvasHeight/2, canvasWidth/2, canvasHeight/2);
          if (index === 2) drawImageCover(img, canvasWidth/2, canvasHeight/2, canvasWidth/2, canvasHeight/2);
        }
        else if (collageLayout === '3x1') {
          const h = canvasHeight / 3;
          drawImageCover(img, 0, index * h, canvasWidth, h);
        }
        else if (collageLayout === '2x1') {
          const w = canvasWidth / 2;
          // INI YANG PALING PENTING UNTUK 2x1:
          drawImageCover(img, index * w, 0, w, canvasHeight);
        }

        ctx.restore();

        loadedCount++;
        if (loadedCount === photos.slice(0, maxPhotos).length) {
          // SEMUA SELESAI → DOWNLOAD
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const link = document.createElement('a');
          link.download = `collage-${collageLayout}-${Date.now()}.jpg`;
          link.href = dataUrl;
          link.click();

          // Simpan ke gallery
          const saved = JSON.parse(localStorage.getItem('photos') || '[]');
          saved.unshift({ id: Date.now(), url: dataUrl, isCollage: true, layout: collageLayout });
          localStorage.setItem('photos', JSON.stringify(saved));
        }
      };
      img.src = photo.url;
    });

  } else {
    // Single photo
    const link = document.createElement('a');
    link.download = `photo-${Date.now()}.jpg`;
    link.href = photos[0].url;
    link.click();
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