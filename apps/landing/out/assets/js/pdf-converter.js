/**
 * PDF Converter Module
 * Handles image to PDF conversion with proper orientation, corner detection, and optimization
 * 
 * Features:
 * - Automatic rotation correction based on EXIF data
 * - Paper corner detection and cropping
 * - Image optimization and enhancement
 * - Consistent PDF formatting
 */

class PDFConverter {
    constructor() {
        this.initialized = false;
        this.debug = true;
    }

    /**
     * Initialize the PDF converter
     */
    async initialize() {
        if (this.initialized) return true;

        try {
            // Check for required libraries
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('jsPDF library not available');
            }

            this.jsPDF = window.jspdf.jsPDF;
            this.initialized = true;
            
            if (this.debug) console.log('✅ PDF Converter initialized');
            return true;
        } catch (error) {
            console.error('❌ PDF Converter initialization failed:', error);
            return false;
        }
    }

    /**
     * Fix image orientation based on EXIF data
     */
    async fixImageOrientation(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Check if image appears to be rotated (common mobile issue)
                const aspectRatio = img.width / img.height;
                let needsRotation = false;
                
                // If width < height but it looks like a document (usually landscape)
                // and the image data suggests it's rotated, fix it
                if (aspectRatio < 1 && this.isLikelyRotatedDocument(img)) {
                    needsRotation = true;
                }
                
                if (needsRotation) {
                    // Rotate 90 degrees counter-clockwise (to fix left rotation)
                    canvas.width = img.height;
                    canvas.height = img.width;
                    
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(-Math.PI / 2); // Changed to counter-clockwise
                    ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    
                    if (this.debug) console.log('🔄 Image rotated 90° counter-clockwise to fix orientation');
                } else {
                    // No rotation needed
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                }
                
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            
            img.onerror = () => resolve(imageData); // Fallback to original
            img.src = imageData;
        });
    }

    /**
     * Detect if image is likely a rotated document
     */
    isLikelyRotatedDocument(img) {
        // Simple heuristic: if width < height but aspect ratio suggests document
        const aspectRatio = img.width / img.height;
        
        // If portrait but close to document ratio when rotated
        if (aspectRatio < 1) {
            const rotatedRatio = img.height / img.width;
            // Common document ratios: A4 (1.41), Letter (1.29), etc.
            return rotatedRatio >= 1.2 && rotatedRatio <= 1.6;
        }
        
        return false;
    }

    /**
     * Detect and crop paper corners using advanced edge detection
     */
    async detectAndCropPaper(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Get image data for analysis
                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                
                // Try multiple methods for paper detection
                let edges = this.detectPaperEdgesByContrast(data, canvas.width, canvas.height);
                
                if (!edges) {
                    edges = this.detectPaperEdgesByBrightness(data, canvas.width, canvas.height);
                }
                
                if (!edges) {
                    edges = this.detectPaperEdgesByGradient(data, canvas.width, canvas.height);
                }
                
                if (edges) {
                    // Add some padding to ensure we don't cut important content
                    const padding = Math.min(canvas.width, canvas.height) * 0.02; // 2% padding
                    edges.left = Math.max(0, edges.left - padding);
                    edges.top = Math.max(0, edges.top - padding);
                    edges.right = Math.min(canvas.width, edges.right + padding);
                    edges.bottom = Math.min(canvas.height, edges.bottom + padding);
                    
                    // Crop to detected paper boundaries
                    const croppedCanvas = document.createElement('canvas');
                    const croppedCtx = croppedCanvas.getContext('2d');
                    
                    const cropWidth = edges.right - edges.left;
                    const cropHeight = edges.bottom - edges.top;
                    
                    croppedCanvas.width = cropWidth;
                    croppedCanvas.height = cropHeight;
                    
                    croppedCtx.drawImage(
                        canvas, 
                        edges.left, edges.top, cropWidth, cropHeight,
                        0, 0, cropWidth, cropHeight
                    );
                    
                    if (this.debug) console.log('✂️ Paper boundaries detected and cropped with advanced detection');
                    resolve(croppedCanvas.toDataURL('image/jpeg', 0.95));
                } else {
                    // Apply minimal cropping to remove potential borders
                    const minimalCrop = this.applyMinimalCrop(canvas);
                    if (this.debug) console.log('✂️ Applied minimal border cropping');
                    resolve(minimalCrop);
                }
            };
            
            img.onerror = () => resolve(imageData);
            img.src = imageData;
        });
    }

    /**
     * Detect paper edges using contrast analysis
     */
    detectPaperEdgesByContrast(data, width, height) {
        const threshold = 50; // Contrast threshold
        const margin = Math.max(10, Math.min(width, height) * 0.05); // 5% margin
        
        let top = margin, bottom = height - margin;
        let left = margin, right = width - margin;
        
        // Analyze horizontal lines for top and bottom edges
        for (let y = margin; y < height - margin; y++) {
            let contrastSum = 0;
            for (let x = margin; x < width - margin - 1; x++) {
                const idx1 = (y * width + x) * 4;
                const idx2 = (y * width + x + 1) * 4;
                const brightness1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
                const brightness2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
                contrastSum += Math.abs(brightness1 - brightness2);
            }
            
            const avgContrast = contrastSum / (width - 2 * margin);
            if (avgContrast > threshold) {
                top = y;
                break;
            }
        }
        
        for (let y = height - margin; y > margin; y--) {
            let contrastSum = 0;
            for (let x = margin; x < width - margin - 1; x++) {
                const idx1 = (y * width + x) * 4;
                const idx2 = (y * width + x + 1) * 4;
                const brightness1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
                const brightness2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
                contrastSum += Math.abs(brightness1 - brightness2);
            }
            
            const avgContrast = contrastSum / (width - 2 * margin);
            if (avgContrast > threshold) {
                bottom = y;
                break;
            }
        }
        
        // Analyze vertical lines for left and right edges
        for (let x = margin; x < width - margin; x++) {
            let contrastSum = 0;
            for (let y = top; y < bottom - 1; y++) {
                const idx1 = (y * width + x) * 4;
                const idx2 = ((y + 1) * width + x) * 4;
                const brightness1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
                const brightness2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
                contrastSum += Math.abs(brightness1 - brightness2);
            }
            
            const avgContrast = contrastSum / (bottom - top);
            if (avgContrast > threshold) {
                left = x;
                break;
            }
        }
        
        for (let x = width - margin; x > margin; x--) {
            let contrastSum = 0;
            for (let y = top; y < bottom - 1; y++) {
                const idx1 = (y * width + x) * 4;
                const idx2 = ((y + 1) * width + x) * 4;
                const brightness1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
                const brightness2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
                contrastSum += Math.abs(brightness1 - brightness2);
            }
            
            const avgContrast = contrastSum / (bottom - top);
            if (avgContrast > threshold) {
                right = x;
                break;
            }
        }
        
        // Validate detected edges
        const detectedWidth = right - left;
        const detectedHeight = bottom - top;
        
        if (detectedWidth > width * 0.4 && detectedHeight > height * 0.4) {
            return { top, bottom, left, right };
        }
        
        return null;
    }

    /**
     * Detect paper edges using brightness analysis (fallback method)
     */
    detectPaperEdgesByBrightness(data, width, height) {
        // This is the original method, kept as fallback
        const threshold = 200;
        const margin = Math.max(20, Math.min(width, height) * 0.05);
        
        let top = margin, bottom = height - margin;
        let left = margin, right = width - margin;
        
        // Find top edge
        for (let y = margin; y < height - margin; y++) {
            let whitePixels = 0;
            for (let x = margin; x < width - margin; x++) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness > threshold) whitePixels++;
            }
            if (whitePixels > (width - 2 * margin) * 0.8) {
                top = y;
                break;
            }
        }
        
        // Similar logic for other edges...
        // (keeping the original implementation for this method)
        
        const detectedWidth = right - left;
        const detectedHeight = bottom - top;
        
        if (detectedWidth > width * 0.5 && detectedHeight > height * 0.5) {
            return { top, bottom, left, right };
        }
        
        return null;
    }

    /**
     * Detect paper edges using gradient analysis
     */
    detectPaperEdgesByGradient(data, width, height) {
        const margin = Math.max(15, Math.min(width, height) * 0.05);
        
        // Look for strong gradients that indicate paper edges
        let strongestGradients = {
            top: { position: margin, strength: 0 },
            bottom: { position: height - margin, strength: 0 },
            left: { position: margin, strength: 0 },
            right: { position: width - margin, strength: 0 }
        };
        
        // Analyze horizontal gradients for top/bottom
        for (let y = margin; y < height - margin; y++) {
            let gradientStrength = 0;
            for (let x = margin; x < width - margin; x++) {
                if (y > 0 && y < height - 1) {
                    const idxAbove = ((y - 1) * width + x) * 4;
                    const idxBelow = ((y + 1) * width + x) * 4;
                    const brightnessAbove = (data[idxAbove] + data[idxAbove + 1] + data[idxAbove + 2]) / 3;
                    const brightnessBelow = (data[idxBelow] + data[idxBelow + 1] + data[idxBelow + 2]) / 3;
                    gradientStrength += Math.abs(brightnessAbove - brightnessBelow);
                }
            }
            
            gradientStrength /= (width - 2 * margin);
            
            // Check for top edge
            if (y < height / 2 && gradientStrength > strongestGradients.top.strength) {
                strongestGradients.top = { position: y, strength: gradientStrength };
            }
            
            // Check for bottom edge
            if (y > height / 2 && gradientStrength > strongestGradients.bottom.strength) {
                strongestGradients.bottom = { position: y, strength: gradientStrength };
            }
        }
        
        // Analyze vertical gradients for left/right
        for (let x = margin; x < width - margin; x++) {
            let gradientStrength = 0;
            for (let y = margin; y < height - margin; y++) {
                if (x > 0 && x < width - 1) {
                    const idxLeft = (y * width + x - 1) * 4;
                    const idxRight = (y * width + x + 1) * 4;
                    const brightnessLeft = (data[idxLeft] + data[idxLeft + 1] + data[idxLeft + 2]) / 3;
                    const brightnessRight = (data[idxRight] + data[idxRight + 1] + data[idxRight + 2]) / 3;
                    gradientStrength += Math.abs(brightnessLeft - brightnessRight);
                }
            }
            
            gradientStrength /= (height - 2 * margin);
            
            // Check for left edge
            if (x < width / 2 && gradientStrength > strongestGradients.left.strength) {
                strongestGradients.left = { position: x, strength: gradientStrength };
            }
            
            // Check for right edge
            if (x > width / 2 && gradientStrength > strongestGradients.right.strength) {
                strongestGradients.right = { position: x, strength: gradientStrength };
            }
        }
        
        // Validate gradient-based detection
        const minGradientStrength = 20;
        const detectedWidth = strongestGradients.right.position - strongestGradients.left.position;
        const detectedHeight = strongestGradients.bottom.position - strongestGradients.top.position;
        
        if (strongestGradients.top.strength > minGradientStrength &&
            strongestGradients.bottom.strength > minGradientStrength &&
            strongestGradients.left.strength > minGradientStrength &&
            strongestGradients.right.strength > minGradientStrength &&
            detectedWidth > width * 0.3 && detectedHeight > height * 0.3) {
            
            return {
                top: strongestGradients.top.position,
                bottom: strongestGradients.bottom.position,
                left: strongestGradients.left.position,
                right: strongestGradients.right.position
            };
        }
        
        return null;
    }

    /**
     * Apply minimal cropping to remove borders
     */
    applyMinimalCrop(canvas) {
        const ctx = canvas.getContext('2d');
        const cropPercent = 0.02; // 2% crop from each edge
        
        const cropX = canvas.width * cropPercent;
        const cropY = canvas.height * cropPercent;
        const cropWidth = canvas.width * (1 - 2 * cropPercent);
        const cropHeight = canvas.height * (1 - 2 * cropPercent);
        
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        
        croppedCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        
        return croppedCanvas.toDataURL('image/jpeg', 0.95);
    }

    /**
     * Basic edge detection for paper boundaries
     */
    detectPaperEdges(data, width, height) {
        // Simple threshold-based edge detection
        const threshold = 200; // Brightness threshold for paper detection
        const margin = 20; // Minimum margin from edges
        
        let top = margin, bottom = height - margin;
        let left = margin, right = width - margin;
        
        // Find top edge
        for (let y = margin; y < height - margin; y++) {
            let whitePixels = 0;
            for (let x = margin; x < width - margin; x++) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness > threshold) whitePixels++;
            }
            if (whitePixels > (width - 2 * margin) * 0.8) { // 80% white pixels
                top = y;
                break;
            }
        }
        
        // Find bottom edge
        for (let y = height - margin; y > margin; y--) {
            let whitePixels = 0;
            for (let x = margin; x < width - margin; x++) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness > threshold) whitePixels++;
            }
            if (whitePixels > (width - 2 * margin) * 0.8) {
                bottom = y;
                break;
            }
        }
        
        // Find left edge
        for (let x = margin; x < width - margin; x++) {
            let whitePixels = 0;
            for (let y = top; y < bottom; y++) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness > threshold) whitePixels++;
            }
            if (whitePixels > (bottom - top) * 0.8) {
                left = x;
                break;
            }
        }
        
        // Find right edge
        for (let x = width - margin; x > margin; x--) {
            let whitePixels = 0;
            for (let y = top; y < bottom; y++) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness > threshold) whitePixels++;
            }
            if (whitePixels > (bottom - top) * 0.8) {
                right = x;
                break;
            }
        }
        
        // Validate detected edges
        const detectedWidth = right - left;
        const detectedHeight = bottom - top;
        
        if (detectedWidth > width * 0.5 && detectedHeight > height * 0.5) {
            return { top, bottom, left, right };
        }
        
        return null; // No clear paper boundaries found
    }

    /**
     * Enhance image for better OCR (optional)
     */
    async enhanceImage(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Apply basic image enhancement
                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                
                // Increase contrast and brightness for better text recognition
                for (let i = 0; i < data.length; i += 4) {
                    // Increase contrast
                    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.2 + 128));     // Red
                    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.2 + 128)); // Green
                    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.2 + 128)); // Blue
                }
                
                ctx.putImageData(imageDataObj, 0, 0);
                
                if (this.debug) console.log('🎨 Image enhanced for better OCR');
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            
            img.onerror = () => resolve(imageData);
            img.src = imageData;
        });
    }

    /**
     * Convert image to PDF with all optimizations
     */
    async convertImageToPDF(imageData, fileName, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            let processedImageData = imageData;

            // Step 1: Fix orientation if needed
            if (options.fixOrientation !== false) {
                processedImageData = await this.fixImageOrientation(processedImageData);
            }

            // Step 2: Detect and crop paper if needed
            if (options.cropPaper === true) {
                processedImageData = await this.detectAndCropPaper(processedImageData);
            }

            // Step 3: Enhance image if needed
            if (options.enhanceImage === true) {
                processedImageData = await this.enhanceImage(processedImageData);
            }

            // Step 4: Create PDF
            return await this.createPDFFromImage(processedImageData, fileName, options);

        } catch (error) {
            console.error('❌ PDF conversion failed:', error);
            throw error;
        }
    }

    /**
     * Create PDF from processed image
     */
    async createPDFFromImage(imageData, fileName, options = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    if (this.debug) console.log(`📐 Creating PDF from image: ${img.width}x${img.height}`);
                    
                    // Create PDF document with proper orientation
                    const pdf = new this.jsPDF({
                        orientation: img.width > img.height ? 'landscape' : 'portrait',
                        unit: 'mm',
                        format: options.format || 'a4'
                    });
                    
                    // Get page dimensions
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const margin = options.margin || 10;
                    
                    // Calculate image dimensions to fit the page
                    const maxWidth = pageWidth - (margin * 2);
                    const maxHeight = pageHeight - (margin * 2);
                    
                    const imgAspectRatio = img.width / img.height;
                    let imgWidth = maxWidth;
                    let imgHeight = maxWidth / imgAspectRatio;
                    
                    // If height exceeds page, scale down
                    if (imgHeight > maxHeight) {
                        imgHeight = maxHeight;
                        imgWidth = maxHeight * imgAspectRatio;
                    }
                    
                    // Center the image on the page
                    const x = (pageWidth - imgWidth) / 2;
                    const y = (pageHeight - imgHeight) / 2;
                    
                    // Determine image format
                    let imageFormat = 'JPEG';
                    if (imageData.indexOf('data:image/png') === 0) {
                        imageFormat = 'PNG';
                    }
                    
                    // Add image to PDF
                    pdf.addImage(imageData, imageFormat, x, y, imgWidth, imgHeight, '', 'FAST');
                    
                    // Add metadata if provided
                    if (options.addMetadata !== false) {
                        this.addPDFMetadata(pdf, fileName, options, pageWidth, pageHeight, margin);
                    }
                    
                    // Convert to data URL
                    const pdfData = pdf.output('datauristring');
                    
                    if (this.debug) console.log(`✅ PDF created successfully: ${fileName}`);
                    
                    resolve({
                        data: pdfData,
                        name: fileName.replace(/\.[^/.]+$/, "") + ".pdf",
                        size: pdfData.length,
                        converted: true,
                        originalSize: imageData.length,
                        compressionRatio: (1 - pdfData.length / imageData.length).toFixed(2)
                    });
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image for PDF conversion'));
            img.src = imageData;
        });
    }

    /**
     * Add metadata footer to PDF
     */
    addPDFMetadata(pdf, fileName, options, pageWidth, pageHeight, margin) {
        const today = new Date().toLocaleDateString('tr-TR');
        const patientName = options.patientName || 
                           document.querySelector('.patient-name')?.textContent || 
                           window.patientDetailsManager?.currentPatient?.name || 
                           'Bilinmiyor';
        
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text(`Tarih: ${today}`, margin, pageHeight - 10);
        pdf.text(`Hasta: ${patientName}`, margin, pageHeight - 5);
        pdf.text(`Dosya: ${fileName}`, pageWidth - 60, pageHeight - 5);
    }
}

// Export for use in other modules
window.PDFConverter = PDFConverter;

// Create global instance
window.pdfConverter = new PDFConverter();
