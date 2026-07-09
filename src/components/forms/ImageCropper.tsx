import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';

interface ImageCropperProps {
  imageFile: File;
  cropWidth: number;
  cropHeight: number;
  circularCrop?: boolean;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

export function ImageCropper({
  imageFile,
  cropWidth,
  cropHeight,
  circularCrop = false,
  onCrop,
  onCancel,
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image file src
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Adjust zoom or offset on container size or image load
  const handleImageLoad = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;

    // Calculate initial zoom to fit the crop area
    const widthRatio = cropWidth / img.naturalWidth;
    const heightRatio = cropHeight / img.naturalHeight;
    const initialZoom = Math.max(widthRatio, heightRatio, 0.1);
    
    setZoom(initialZoom);
    setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y,
    });
  };

  const handleCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, cropWidth, cropHeight);

    // Apply circular clipping if circularCrop is enabled
    if (circularCrop) {
      ctx.beginPath();
      ctx.arc(cropWidth / 2, cropHeight / 2, Math.min(cropWidth, cropHeight) / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    // Source coordinates and size
    // container center is (0,0) relative to crop box center
    // We need to map container image drawing back to original image coordinates
    const scale = zoom;
    
    // Draw the image onto the canvas according to the current scale & offset
    // Crop box top-left is (0,0) in canvas space.
    // Crop box center is (cropWidth/2, cropHeight/2).
    // The image center relative to crop box center is offset.x, offset.y
    // So the image top-left in canvas space is:
    const dx = cropWidth / 2 + offset.x - (img.naturalWidth * scale) / 2;
    const dy = cropHeight / 2 + offset.y - (img.naturalHeight * scale) / 2;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;

    ctx.drawImage(img, dx, dy, dw, dh);

    // Convert canvas to blob/file
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now(),
        });
        onCrop(croppedFile);
      }
    }, imageFile.type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Crop Image / Avatar</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace */}
        <div 
          className="relative flex items-center justify-center bg-gray-950 h-96 overflow-hidden select-none cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Draggable Image Layer (Below overlay) */}
          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="To Crop"
                onLoad={handleImageLoad}
                draggable={false}
                className="max-w-none absolute pointer-events-none"
                style={{
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  top: '50%',
                  left: '50%',
                  transformOrigin: 'center',
                }}
              />
            )}
          </div>

          {/* Mask & Crop Box Overlay Layer (Always on top, pointer-events-none) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Viewport Box overlaying with massive shadow to darken outside */}
            <div
              style={{
                width: cropWidth,
                height: cropHeight,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                borderRadius: circularCrop ? '50%' : '8px',
                border: '2px solid #3b82f6',
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-4">
            <ZoomOut size={16} className="text-gray-500" />
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <ZoomIn size={16} className="text-gray-500" />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCrop}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Check size={16} className="mr-1.5" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
