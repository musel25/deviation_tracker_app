import React, { useState, useRef, useCallback, useEffect } from 'react';
import SimpleRichTextEditor from './SimpleRichTextEditor';

const ImageTextEditor = ({ value, onChange }) => {
    const [images, setImages] = useState([]);
    const [textElements, setTextElements] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [richText, setRichText] = useState(value || '');
    const [newTextInput, setNewTextInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState(null); // {x, y, initialWidth, initialHeight, handleType}

    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const canvasSize = { width: 800, height: 600 };
    const RESIZE_HANDLE_SIZE = 8; // Size of the corner resize handles

    const handleRichTextChange = (newText) => {
        setRichText(newText);
    };

    // Draw all elements on canvas
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        // Draw images
        images.forEach((img) => {
            if (img.htmlImage && img.htmlImage.complete) {
                ctx.save();
                ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
                ctx.rotate(img.rotation * Math.PI / 180);
                ctx.drawImage(
                    img.htmlImage,
                    -img.width / 2,
                    -img.height / 2,
                    img.width,
                    img.height
                );
                ctx.restore();

                // Draw selection border if selected
                if (selectedElement && selectedElement.id === img.id && selectedElement.type === 'image') {
                    ctx.strokeStyle = '#007bff';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(img.x - 2, img.y - 2, img.width + 4, img.height + 4);
                    ctx.setLineDash([]);

                    // Draw resize handles
                    ctx.fillStyle = '#007bff';
                    const handleSize = RESIZE_HANDLE_SIZE;

                    // Top-left (NW) - aspect ratio or free if only one handle type
                    ctx.fillRect(img.x - handleSize / 2, img.y - handleSize / 2, handleSize, handleSize);
                    // Top-right (NE)
                    ctx.fillRect(img.x + img.width - handleSize / 2, img.y - handleSize / 2, handleSize, handleSize);
                    // Bottom-left (SW)
                    ctx.fillRect(img.x - handleSize / 2, img.y + img.height - handleSize / 2, handleSize, handleSize);
                    // Bottom-right (SE)
                    ctx.fillRect(img.x + img.width - handleSize / 2, img.y + img.height - handleSize / 2, handleSize, handleSize);

                    // Mid-point handles for horizontal/vertical resize
                    ctx.fillStyle = '#00aaff'; // Different color for mid-handles
                    // Mid-left (W)
                    ctx.fillRect(img.x - handleSize / 2, img.y + img.height / 2 - handleSize / 2, handleSize, handleSize);
                    // Mid-top (N)
                    ctx.fillRect(img.x + img.width / 2 - handleSize / 2, img.y - handleSize / 2, handleSize, handleSize);
                    // Mid-right (E)
                    ctx.fillRect(img.x + img.width - handleSize / 2, img.y + img.height / 2 - handleSize / 2, handleSize, handleSize);
                    // Mid-bottom (S)
                    ctx.fillRect(img.x + img.width / 2 - handleSize / 2, img.y + img.height - handleSize / 2, handleSize, handleSize);
                }
            }
        });

        // Draw text elements
        textElements.forEach((text) => {
            ctx.font = `${text.fontSize}px Arial`;
            ctx.fillStyle = text.fill;
            ctx.fillText(text.text, text.x, text.y);

            // Draw selection border if selected
            if (selectedElement && selectedElement.id === text.id && selectedElement.type === 'text') {
                const textMetrics = ctx.measureText(text.text);
                ctx.strokeStyle = '#007bff';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(text.x - 2, text.y - text.fontSize - 2, textMetrics.width + 4, text.fontSize + 4);
                ctx.setLineDash([]);
            }
        });
    }, [images, textElements, selectedElement, canvasSize, RESIZE_HANDLE_SIZE]);

    // Redraw canvas when elements change
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    const loadImageToCanvas = useCallback((file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const aspectRatio = img.width / img.height;
                    const maxWidth = canvasSize.width * 0.5; // Max 50% of canvas width
                    const maxHeight = canvasSize.height * 0.5; // Max 50% of canvas height

                    let newWidth = img.width;
                    let newHeight = img.height;

                    // Scale down if image is too large
                    if (newWidth > maxWidth) {
                        newWidth = maxWidth;
                        newHeight = newWidth / aspectRatio;
                    }
                    if (newHeight > maxHeight) {
                        newHeight = maxHeight;
                        newWidth = newHeight * aspectRatio;
                    }

                    const newImage = {
                        id: Date.now(),
                        x: (canvasSize.width - newWidth) / 2, // Center new image
                        y: (canvasSize.height - newHeight) / 2, // Center new image
                        width: newWidth,
                        height: newHeight,
                        rotation: 0,
                        htmlImage: img,
                        src: event.target.result
                    };
                    setImages(prev => [...prev, newImage]);
                    setSelectedElement({ ...newImage, type: 'image' }); // Select the newly added image
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }, [canvasSize]);


    const handleImageUpload = useCallback((e) => {
        const file = e.target.files[0];
        loadImageToCanvas(file);
    }, [loadImageToCanvas]);

    const handlePaste = useCallback((e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    loadImageToCanvas(file);
                    e.preventDefault(); // Prevent default paste behavior (e.g., pasting into text input)
                    return; // Stop after finding the first image
                }
            }
        }
    }, [loadImageToCanvas]);

    const addTextElement = useCallback(() => {
        if (newTextInput.trim()) {
            const newText = {
                id: Date.now(),
                text: newTextInput,
                x: 100,
                y: 100,
                fontSize: 16,
                fill: 'black'
            };
            setTextElements(prev => [...prev, newText]);
            setNewTextInput('');
            setSelectedElement({ ...newText, type: 'text' }); // Select new text
        }
    }, [newTextInput]);

    const deleteSelected = useCallback(() => {
        if (selectedElement) {
            if (selectedElement.type === 'image') {
                setImages(prev => prev.filter(img => img.id !== selectedElement.id));
            } else if (selectedElement.type === 'text') {
                setTextElements(prev => prev.filter(text => text.id !== selectedElement.id));
            }
            setSelectedElement(null);
        }
    }, [selectedElement]);

    const clearCanvas = useCallback(() => {
        setImages([]);
        setTextElements([]);
        setSelectedElement(null);
    }, []);

    // Helper to check if mouse is over a specific resize handle
    const getHandleType = useCallback((x, y, img) => {
        const handleHalf = RESIZE_HANDLE_SIZE / 2;
        // Corner handles (aspect ratio or free resize)
        if (x >= img.x - handleHalf && x <= img.x + handleHalf && y >= img.y - handleHalf && y <= img.y + handleHalf) return 'nw'; // Top-left
        if (x >= img.x + img.width - handleHalf && x <= img.x + img.width + handleHalf && y >= img.y - handleHalf && y <= img.y + handleHalf) return 'ne'; // Top-right
        if (x >= img.x - handleHalf && x <= img.x + handleHalf && y >= img.y + img.height - handleHalf && y <= img.y + img.height + handleHalf) return 'sw'; // Bottom-left
        if (x >= img.x + img.width - handleHalf && x <= img.x + img.width + handleHalf && y >= img.y + img.height - handleHalf && y <= img.y + img.height + handleHalf) return 'se'; // Bottom-right

        // Mid-point handles (horizontal/vertical resize)
        if (x >= img.x - handleHalf && x <= img.x + handleHalf && y >= img.y + img.height / 2 - handleHalf && y <= img.y + img.height / 2 + handleHalf) return 'w'; // Mid-left
        if (x >= img.x + img.width / 2 - handleHalf && x <= img.x + img.width / 2 + handleHalf && y >= img.y - handleHalf && y <= img.y + handleHalf) return 'n'; // Mid-top
        if (x >= img.x + img.width - handleHalf && x <= img.x + img.width + handleHalf && y >= img.y + img.height / 2 - handleHalf && y <= img.y + img.height / 2 + handleHalf) return 'e'; // Mid-right
        if (x >= img.x + img.width / 2 - handleHalf && x <= img.x + img.width / 2 + handleHalf && y >= img.y + img.height - handleHalf && y <= img.y + img.height + handleHalf) return 's'; // Mid-bottom

        return null;
    }, [RESIZE_HANDLE_SIZE]);

    const getElementAt = useCallback((x, y) => {
        // Check images for resize handles first
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            if (selectedElement && selectedElement.id === img.id && selectedElement.type === 'image') {
                const handleType = getHandleType(x, y, img);
                if (handleType) {
                    return { ...img, type: 'resize-handle', handleType: handleType };
                }
            }
        }

        // Check text elements (they're drawn on top for selection)
        for (let i = textElements.length - 1; i >= 0; i--) {
            const text = textElements[i];
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.font = `${text.fontSize}px Arial`;
            const textMetrics = ctx.measureText(text.text);

            if (x >= text.x && x <= text.x + textMetrics.width &&
                y >= text.y - text.fontSize && y <= text.y) {
                return { ...text, type: 'text' };
            }
        }

        // Check images for drag
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            if (x >= img.x && x <= img.x + img.width &&
                y >= img.y && y <= img.y + img.height) {
                return { ...img, type: 'image' };
            }
        }

        return null;
    }, [images, textElements, selectedElement, getHandleType]);

    const handleCanvasMouseDown = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const element = getElementAt(x, y);

        if (element) {
            if (element.type === 'resize-handle') {
                setIsResizing(true);
                // The selectedElement will already be the image linked to this handle
                setResizeStart({
                    x: e.clientX,
                    y: e.clientY,
                    initialWidth: selectedElement.width,
                    initialHeight: selectedElement.height,
                    initialX: selectedElement.x,
                    initialY: selectedElement.y,
                    handleType: element.handleType // Store which handle was clicked
                });
            } else {
                setSelectedElement(element);
                setIsDragging(true);
                setDragOffset({ x: x - element.x, y: y - element.y });
            }
        } else {
            setSelectedElement(null);
        }
    }, [getElementAt, selectedElement]);

    const handleCanvasMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const minSize = 20; // Minimum size for images

        if (isDragging && selectedElement) {
            const newX = currentX - dragOffset.x;
            const newY = currentY - dragOffset.y;

            if (selectedElement.type === 'image') {
                setImages(prev => prev.map(img =>
                    img.id === selectedElement.id ? { ...img, x: newX, y: newY } : img
                ));
            } else if (selectedElement.type === 'text') {
                setTextElements(prev => prev.map(text =>
                    text.id === selectedElement.id ? { ...text, x: newX, y: newY } : text
                ));
            }
        } else if (isResizing && selectedElement && selectedElement.type === 'image' && resizeStart) {
            const dx = e.clientX - resizeStart.x;
            const dy = e.clientY - resizeStart.y;

            let newWidth = selectedElement.width;
            let newHeight = selectedElement.height;
            let newX = selectedElement.x;
            let newY = selectedElement.y;

            switch (resizeStart.handleType) {
                case 'se': // Bottom-right
                    newWidth = Math.max(minSize, resizeStart.initialWidth + dx);
                    newHeight = Math.max(minSize, resizeStart.initialHeight + (dx / (resizeStart.initialWidth / resizeStart.initialHeight))); // Aspect Ratio
                    break;
                case 'sw': // Bottom-left
                    newWidth = Math.max(minSize, resizeStart.initialWidth - dx);
                    newHeight = Math.max(minSize, resizeStart.initialHeight + (dx / (resizeStart.initialWidth / resizeStart.initialHeight))); // Aspect Ratio
                    newX = resizeStart.initialX + dx; // Move X
                    break;
                case 'ne': // Top-right
                    newWidth = Math.max(minSize, resizeStart.initialWidth + dx);
                    newHeight = Math.max(minSize, resizeStart.initialHeight - (dx / (resizeStart.initialWidth / resizeStart.initialHeight))); // Aspect Ratio
                    newY = resizeStart.initialY + dy; // Move Y
                    break;
                case 'nw': // Top-left
                    newWidth = Math.max(minSize, resizeStart.initialWidth - dx);
                    newHeight = Math.max(minSize, resizeStart.initialHeight - (dx / (resizeStart.initialWidth / resizeStart.initialHeight))); // Aspect Ratio
                    newX = resizeStart.initialX + dx; // Move X
                    newY = resizeStart.initialY + dy; // Move Y
                    break;
                case 'e': // Mid-right (Horizontal only)
                    newWidth = Math.max(minSize, resizeStart.initialWidth + dx);
                    newHeight = resizeStart.initialHeight; // Keep initial height
                    break;
                case 's': // Mid-bottom (Vertical only)
                    newHeight = Math.max(minSize, resizeStart.initialHeight + dy);
                    newWidth = resizeStart.initialWidth; // Keep initial width
                    break;
                case 'w': // Mid-left (Horizontal only)
                    newWidth = Math.max(minSize, resizeStart.initialWidth - dx);
                    newHeight = resizeStart.initialHeight;
                    newX = resizeStart.initialX + dx; // Move X
                    break;
                case 'n': // Mid-top (Vertical only)
                    newHeight = Math.max(minSize, resizeStart.initialHeight - dy);
                    newWidth = resizeStart.initialWidth;
                    newY = resizeStart.initialY + dy; // Move Y
                    break;
                default:
                    break;
            }

            // Update the image being resized
            setImages(prev => prev.map(img =>
                img.id === selectedElement.id ? { ...img, x: newX, y: newY, width: newWidth, height: newHeight } : img
            ));
            setSelectedElement(prev => ({ ...prev, x: newX, y: newY, width: newWidth, height: newHeight })); // Update selected element for immediate feedback
        } else {
            // Change cursor when hovering over elements/handles
            let cursor = 'auto';
            const hoveredElement = getElementAt(currentX, currentY);
            if (hoveredElement) {
                if (hoveredElement.type === 'resize-handle') {
                    // Set specific cursor for each handle type
                    switch (hoveredElement.handleType) {
                        case 'nw': case 'se': cursor = 'nwse-resize'; break;
                        case 'ne': case 'sw': cursor = 'nesw-resize'; break;
                        case 'n': case 's': cursor = 'ns-resize'; break;
                        case 'e': case 'w': cursor = 'ew-resize'; break;
                        default: cursor = 'auto';
                    }
                } else {
                    cursor = 'grab'; // For draggable elements
                }
            } else {
                cursor = 'crosshair'; // Default for canvas
            }
            canvas.style.cursor = cursor;
        }
    }, [isDragging, selectedElement, dragOffset, isResizing, resizeStart, getElementAt]);

    const handleCanvasMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeStart(null);
    }, []);

    // Attach global mouse listeners for dragging/resizing outside canvas bounds
    useEffect(() => {
        window.addEventListener('mouseup', handleCanvasMouseUp);
        // Only add mousemove globally when actually dragging or resizing to avoid performance issues
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleCanvasMouseMove);
        }
        return () => {
            window.removeEventListener('mouseup', handleCanvasMouseUp);
            window.removeEventListener('mousemove', handleCanvasMouseMove); // Clean up
        };
    }, [handleCanvasMouseUp, handleCanvasMouseMove, isDragging, isResizing]);


    const exportCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL();
    }, []);

    // Update parent component when content changes
    useEffect(() => {
        const editorContent = {
            richText,
            images: images.map(img => ({
                id: img.id,
                x: img.x,
                y: img.y,
                width: img.width,
                height: img.height,
                rotation: img.rotation,
                src: img.src // Keep the base64 src for re-loading
            })), // Remove HTML image for serialization
            textElements,
            canvasData: images.length > 0 || textElements.length > 0 ? exportCanvas() : null
        };
        onChange && onChange(editorContent);
    }, [richText, images, textElements, onChange, exportCanvas]);

    return (
        <div className="image-text-editor" onPaste={handlePaste}>
            <style jsx>{`
                /* Your existing CSS-in-JS styles here */
                .image-text-editor {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    background-color: #f9f9f9;
                }

                .editor-section {
                    margin-bottom: 20px;
                }

                .editor-section h4 {
                    margin-bottom: 10px;
                    color: #333;
                }

                .canvas-container {
                    border: 2px solid #ddd;
                    border-radius: 4px;
                    background-color: white;
                    margin-bottom: 15px;
                    display: inline-block;
                    /* Updated cursor style for canvas - this will be overridden by JS for handle specific cursors */
                    cursor: ${isResizing ? 'se-resize' : (isDragging ? 'grabbing' : 'crosshair')};
                }

                .canvas-container canvas {
                    display: block;
                }

                .controls {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .controls button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    background-color: #007bff;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                }

                .controls button:hover {
                    background-color: #0056b3;
                }

                .controls button.danger {
                    background-color: #dc3545;
                }

                .controls button.danger:hover {
                    background-color: #c82333;
                }

                .controls input[type="file"] {
                    display: none;
                }

                .text-input-group {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .text-input-group input {
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    flex: 1;
                }

                .instructions {
                    background-color: #e3f2fd;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 15px;
                    font-size: 14px;
                    color: #1976d2;
                }

                .selected-info {
                    background-color: #fff3cd;
                    padding: 8px;
                    border-radius: 4px;
                    margin-bottom: 10px;
                    font-size: 14px;
                    color: #856404;
                }
            `}</style>

            <div className="instructions">
                <strong>Instructions:</strong> Paste images (Ctrl+V or Cmd+V) or upload them (JPG, PNG, GIF) and add text overlays. Click elements to select them (highlighted in blue), then drag to move. To resize an image, click and drag its **corner handles for proportional resize**, or its **mid-point handles for horizontal/vertical only resize**. Use the rich text editor below for additional formatted content.
            </div>

            {selectedElement && (
                <div className="selected-info">
                    Selected: {selectedElement.type === 'image' ? 'Image' : `Text: "${selectedElement.text}"`}
                </div>
            )}

            <div className="editor-section">
                <h4>📷 Image & Text Canvas</h4>

                <div className="controls">
                    <button onClick={() => fileInputRef.current?.click()}>
                        📁 Upload Image
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                    />

                    <div className="text-input-group">
                        <input
                            type="text"
                            placeholder="Add text overlay..."
                            value={newTextInput}
                            onChange={(e) => setNewTextInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addTextElement()}
                        />
                        <button onClick={addTextElement}>Add Text</button>
                    </div>

                    {selectedElement && (
                        <button className="danger" onClick={deleteSelected}>
                            🗑️ Delete Selected
                        </button>
                    )}

                    <button className="danger" onClick={clearCanvas}>
                        🧹 Clear All
                    </button>
                </div>

                <div className="canvas-container">
                    <canvas
                        ref={canvasRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp} // End drag/resize if mouse leaves canvas
                    />
                </div>
            </div>

            <div className="editor-section">
                <h4>📝 Rich Text Editor</h4>
                <SimpleRichTextEditor
                    value={richText}
                    onChange={handleRichTextChange}
                    placeholder="Enter detailed description here. Use toolbar buttons for formatting..."
                />
            </div>
        </div>
    );
};

export default ImageTextEditor;