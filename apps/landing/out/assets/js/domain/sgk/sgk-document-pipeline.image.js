(function(){
  // Image processing methods moved out of the monolith to keep the core small.
  if (typeof SGKDocumentPipeline === 'undefined') return;

  const proto = SGKDocumentPipeline.prototype;

  proto.detectDocumentEdgesAndCrop = async function(file) {
    console.log('✂️ Step (image): detectDocumentEdgesAndCrop');
    try {
      // Use injected imageProcessor if available
      if (this.imageProcessor && typeof this.imageProcessor.detectDocumentEdgesAndCrop === 'function') {
        return await this.imageProcessor.detectDocumentEdgesAndCrop(file);
      }

      // Fallback: read as data URL and return minimal metadata
      const dataUrl = await this.fileToDataURL(file);
      return {
        originalFileName: file.name,
        croppedImage: dataUrl,
        originalImageData: dataUrl,
        contour: null,
        rotationCorrected: false,
        rotationAngle: 0,
        processingApplied: false,
        metadata: { width: 0, height: 0, gpuAccelerated: false }
      };
    } catch (err) {
      console.warn('Image crop failed:', err);
      return { croppedImage: await this.fileToDataURL(file), processingApplied:false };
    }
  };

  // Several utility functions for image processing
  proto.distance = function(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  proto.applyPerspectiveTransform = function(ctx, img, contour, outputWidth, outputHeight, originalWidth, originalHeight) {
    // Simplified crop fallback (keeps compatibility with previous implementation)
    let minX = contour[0].x, maxX = contour[0].x;
    let minY = contour[0].y, maxY = contour[0].y;
    contour.forEach(point => { minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y); });
    const cropWidth = maxX - minX; const cropHeight = maxY - minY;
    const scaleX = img.width / originalWidth; const scaleY = img.height / originalHeight;
    ctx.drawImage(img, minX * scaleX, minY * scaleY, cropWidth * scaleX, cropHeight * scaleY, 0, 0, outputWidth, outputHeight);
  };

  // Simple smart crop
  proto.applySmartCrop = function(imageData, width, height) {
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    const margin = Math.min(width, height) * 0.05;
    const cropX = Math.max(0, Math.floor(margin));
    const cropY = Math.max(0, Math.floor(margin));
    const cropWidth = Math.min(width - 2 * cropX, width);
    const cropHeight = Math.min(height - 2 * cropY, height);
    canvas.width = cropWidth; canvas.height = cropHeight;
    const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d'); tempCanvas.width = width; tempCanvas.height = height; tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // Minimal file to imageData helper (used by detection algorithms)
  proto.fileToImageData = async function(file) {
    return await this.fileToDataURL(file);
  };

})();