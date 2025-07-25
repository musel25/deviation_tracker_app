import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import SimpleRichTextEditor from './SimpleRichTextEditor';
import TextToolbar from './TextToolbar';

/**
 * A utility function to wrap text based on a max width.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {string} text - The text to wrap.
 * @param {number} maxWidth - The maximum width for a line.
 * @returns {string[]} - An array of strings, where each string is a line of text.
 */
const getTextLines = (ctx, text, maxWidth) => {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
};


const ImageTextEditor = ({ value, onChange }) => {
    const [images, setImages] = useState([]);
    const [textElements, setTextElements] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [richText, setRichText] = useState(value || '');
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isAddingText, setIsAddingText] = useState(false);
    const [editingTextElement, setEditingTextElement] = useState(null);

    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const editorWrapperRef = useRef(null);

    const canvasSize = useMemo(() => ({ width: 800, height: 600 }), []);
    const RESIZE_HANDLE_SIZE = 8;
    const MIN_FONT_SIZE = 8;
    const MIN_BOX_SIZE = 20;

    useEffect(() => {
        if (value !== richText) {
            setRichText(value || '');
        }
    }, [value, richText]);

    const handleRichTextChange = useCallback((newText) => {
        setRichText(newText);
    }, []);

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
                ctx.drawImage(img.htmlImage, -img.width / 2, -img.height / 2, img.width, img.height);
                ctx.restore();

                if (selectedElement && selectedElement.id === img.id && selectedElement.type === 'image') {
                    ctx.strokeStyle = '#007bff';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(img.x, img.y, img.width, img.height);
                    ctx.setLineDash([]);
                    
                    const handleSize = RESIZE_HANDLE_SIZE;
                    ctx.fillStyle = '#007bff';
                    ctx.fillRect(img.x - handleSize / 2, img.y - handleSize / 2, handleSize, handleSize);
                    ctx.fillRect(img.x + img.width - handleSize / 2, img.y - handleSize / 2, handleSize, handleSize);
                    ctx.fillRect(img.x - handleSize / 2, img.y + img.height - handleSize / 2, handleSize, handleSize);
                    ctx.fillRect(img.x + img.width - handleSize / 2, img.y + img.height - handleSize / 2, handleSize, handleSize);
                    ctx.fillStyle = '#00aaff';
                    ctx.fillRect(img.x + img.width / 2 - handleSize / 2, img.y - handleSize / 2, handleSize, handleSize);
                    ctx.fillRect(img.x + img.width / 2 - handleSize / 2, img.y + img.height - handleSize / 2, handleSize, handleSize);
                    ctx.fillRect(img.x - handleSize / 2, img.y + img.height / 2 - handleSize / 2, handleSize, handleSize);
                    ctx.fillRect(img.x + img.width - handleSize / 2, img.y + img.height / 2 - handleSize / 2, handleSize, handleSize);
                }
            }
        });

        // Draw text elements
        textElements.forEach((text) => {
            const isEditingThis = editingTextElement && editingTextElement.id === text.id;
            if (isEditingThis) return;
            
            const font = `${text.fontStyle || 'normal'} ${text.fontWeight || 'normal'} ${text.fontSize}px ${text.fontFamily || 'Arial'}`;
            ctx.font = font;
            
            const lines = getTextLines(ctx, text.text, text.width);
            
            lines.forEach((line, index) => {
                const yPos = text.y + (index * text.fontSize * 1.2); // Use line height for better spacing
                ctx.fillStyle = text.fill;
                ctx.textBaseline = 'top';
                
                const metrics = ctx.measureText(line);
                
                if (text.highlightColor && text.highlightColor !== 'transparent') {
                    ctx.fillStyle = text.highlightColor;
                    ctx.fillRect(text.x, yPos, metrics.width, text.fontSize * 1.2);
                    ctx.fillStyle = text.fill;
                }

                ctx.fillText(line, text.x, yPos);

                ctx.strokeStyle = text.fill;
                ctx.lineWidth = Math.max(1, text.fontSize / 15);
                
                if (text.underline) {
                    ctx.beginPath();
                    ctx.moveTo(text.x, yPos + text.fontSize + 1);
                    ctx.lineTo(text.x + metrics.width, yPos + text.fontSize + 1);
                    ctx.stroke();
                }
                if (text.strikethrough) {
                    const midPoint = yPos + text.fontSize / 2;
                    ctx.beginPath();
                    ctx.moveTo(text.x, midPoint);
                    ctx.lineTo(text.x + metrics.width, midPoint);
                    ctx.stroke();
                }
            });

            if (selectedElement && selectedElement.id === text.id) {
                ctx.strokeStyle = '#007bff';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(text.x, text.y, text.width, text.height);
                ctx.setLineDash([]);
                
                const handleSize = RESIZE_HANDLE_SIZE;
                ctx.fillStyle = '#007bff';
                ctx.fillRect(text.x - handleSize / 2, text.y - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(text.x + text.width - handleSize / 2, text.y - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(text.x - handleSize / 2, text.y + text.height - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(text.x + text.width - handleSize / 2, text.y + text.height - handleSize / 2, handleSize, handleSize);
                ctx.fillStyle = '#00aaff';
                ctx.fillRect(text.x + text.width / 2 - handleSize / 2, text.y - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(text.x + text.width / 2 - handleSize / 2, text.y + text.height - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(text.x - handleSize / 2, text.y + text.height / 2 - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(text.x + text.width - handleSize / 2, text.y + text.height / 2 - handleSize / 2, handleSize, handleSize);
            }
        });
    }, [images, textElements, selectedElement, canvasSize, RESIZE_HANDLE_SIZE, editingTextElement]);

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
                    const maxWidth = canvasSize.width * 0.5;
                    const maxHeight = canvasSize.height * 0.5;
                    let newWidth = img.width;
                    let newHeight = img.height;
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
                        x: (canvasSize.width - newWidth) / 2,
                        y: (canvasSize.height - newHeight) / 2,
                        width: newWidth,
                        height: newHeight,
                        rotation: 0,
                        htmlImage: img,
                        src: event.target.result
                    };
                    setImages(prev => [...prev, newImage]);
                    setSelectedElement({ ...newImage, type: 'image' });
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
                    e.preventDefault();
                    return;
                }
            }
        }
    }, [loadImageToCanvas]);

    const deleteSelected = useCallback(() => {
        if (selectedElement) {
            if (selectedElement.type === 'image') {
                setImages(prev => prev.filter(img => img.id !== selectedElement.id));
            } else if (selectedElement.type.startsWith('text')) {
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
    
    const getHandleType = useCallback((x, y, el) => {
        const handleHalf = RESIZE_HANDLE_SIZE / 2;
        const box = { x: el.x, y: el.y, width: el.width, height: el.height };

        if (x >= box.x - handleHalf && x <= box.x + handleHalf && y >= box.y - handleHalf && y <= box.y + handleHalf) return 'nw';
        if (x >= box.x + box.width - handleHalf && x <= box.x + box.width + handleHalf && y >= box.y - handleHalf && y <= box.y + handleHalf) return 'ne';
        if (x >= box.x - handleHalf && x <= box.x + handleHalf && y >= box.y + box.height - handleHalf && y <= box.y + box.height + handleHalf) return 'sw';
        if (x >= box.x + box.width - handleHalf && x <= box.x + box.width + handleHalf && y >= box.y + box.height - handleHalf && y <= box.y + box.height + handleHalf) return 'se';
        if (x >= box.x + box.width / 2 - handleHalf && x <= box.x + box.width/2 + handleHalf && y >= box.y - handleHalf && y <= box.y + handleHalf) return 'n';
        if (x >= box.x + box.width / 2 - handleHalf && x <= box.x + box.width/2 + handleHalf && y >= box.y + box.height - handleHalf && y <= box.y + box.height + handleHalf) return 's';
        if (x >= box.x - handleHalf && x <= box.x + handleHalf && y >= box.y + box.height/2 - handleHalf && y <= box.y + box.height/2 + handleHalf) return 'w';
        if (x >= box.x + box.width - handleHalf && x <= box.x + box.width + handleHalf && y >= box.y + box.height/2 - handleHalf && y <= box.y + box.height/2 + handleHalf) return 'e';

        return null;
    }, [RESIZE_HANDLE_SIZE]);

    const getElementAt = useCallback((x, y) => {
        if (selectedElement) {
             const handleType = getHandleType(x, y, selectedElement);
             if (handleType) {
                 return { ...selectedElement, type: `${selectedElement.type}-resize-handle`, handleType };
             }
        }

        for (let i = textElements.length - 1; i >= 0; i--) {
            const text = textElements[i];
            if (x >= text.x && x <= text.x + text.width && y >= text.y && y <= text.y + text.height) {
                return { ...text, type: 'text' };
            }
        }
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
                return { ...img, type: 'image' };
            }
        }
        return null;
    }, [images, textElements, selectedElement, getHandleType]);

    const handleCanvasDoubleClick = (e) => {
        if (isAddingText) return; 

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const element = getElementAt(x, y);

        if (element && element.type === 'text') {
            setEditingTextElement(element);
        }
    };
    
    const handleCanvasMouseDown = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (editingTextElement) {
            const clickedOnEditingText = x >= editingTextElement.x && x <= editingTextElement.x + editingTextElement.width &&
                                       y >= editingTextElement.y && y <= editingTextElement.y + editingTextElement.height;
            if (!clickedOnEditingText) {
                setSelectedElement(editingTextElement);
                setEditingTextElement(null);
            }
        }

        if (isAddingText) {
            const newText = {
                id: Date.now(),
                text: 'Type here...',
                x: x,
                y: y,
                fontSize: 30,
                fill: '#000000',
                fontFamily: 'Arial',
                fontWeight: 'normal',
                fontStyle: 'normal',
                underline: false,
                strikethrough: false,
                highlightColor: 'transparent',
                width: 200,
                height: 50,
                type: 'text',
            };
            setTextElements(prev => [...prev, newText]);
            setIsAddingText(false);
            setSelectedElement(newText);
            setEditingTextElement(newText);
            return;
        }

        const element = getElementAt(x, y);

        if (element) {
            if (element.type.endsWith('-resize-handle')) {
                setIsResizing(true);
                setResizeStart({
                    element: element,
                    startX: e.clientX,
                    startY: e.clientY,
                    handleType: element.handleType
                });
                setSelectedElement(element);
            } else {
                setSelectedElement(element);
                setIsDragging(true);
                setDragOffset({ x: x - element.x, y: y - element.y });
            }
        } else {
            setSelectedElement(null);
        }
    }, [getElementAt, isAddingText, editingTextElement]);

    const handleCanvasMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        if (isDragging && selectedElement) {
            const newX = currentX - dragOffset.x;
            const newY = currentY - dragOffset.y;
            const updatedElement = { ...selectedElement, x: newX, y: newY };
            
            if (updatedElement.type.startsWith('text')) {
                setTextElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
            } else {
                setImages(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
            }
            setSelectedElement(updatedElement);
            if (editingTextElement?.id === updatedElement.id) {
                setEditingTextElement(updatedElement);
            }

        } else if (isResizing && resizeStart) {
            const { element: initialElement, startX, startY, handleType } = resizeStart;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newWidth = initialElement.width;
            let newHeight = initialElement.height;
            let newX = initialElement.x;
            let newY = initialElement.y;

            switch (handleType) {
                case 'se': newWidth = Math.max(MIN_BOX_SIZE, initialElement.width + dx); newHeight = Math.max(MIN_BOX_SIZE, initialElement.height + dy); break;
                case 'sw': newWidth = Math.max(MIN_BOX_SIZE, initialElement.width - dx); newHeight = Math.max(MIN_BOX_SIZE, initialElement.height + dy); newX = initialElement.x + dx; break;
                case 'ne': newWidth = Math.max(MIN_BOX_SIZE, initialElement.width + dx); newHeight = Math.max(MIN_BOX_SIZE, initialElement.height - dy); newY = initialElement.y + dy; break;
                case 'nw': newWidth = Math.max(MIN_BOX_SIZE, initialElement.width - dx); newHeight = Math.max(MIN_BOX_SIZE, initialElement.height - dy); newX = initialElement.x + dx; newY = initialElement.y + dy; break;
                case 'n': newHeight = Math.max(MIN_BOX_SIZE, initialElement.height - dy); newY = initialElement.y + dy; break;
                case 's': newHeight = Math.max(MIN_BOX_SIZE, initialElement.height + dy); break;
                case 'w': newWidth = Math.max(MIN_BOX_SIZE, initialElement.width - dx); newX = initialElement.x + dx; break;
                case 'e': newWidth = Math.max(MIN_BOX_SIZE, initialElement.width + dx); break;
                default: break;
            }

            const updatedElement = { ...initialElement, x: newX, y: newY, width: newWidth, height: newHeight };
            
            if (initialElement.type.startsWith('text')) {
                setTextElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
            } else {
                setImages(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
            }
            setSelectedElement(updatedElement);
            if (editingTextElement?.id === updatedElement.id) {
                setEditingTextElement(updatedElement);
            }
            return;
        } else {
            let cursor = isAddingText ? 'copy' : 'crosshair';
            const hoveredElement = getElementAt(currentX, currentY);
            if (hoveredElement) {
                if (hoveredElement.type.endsWith('-resize-handle')) {
                    switch (hoveredElement.handleType) {
                        case 'nw': case 'se': cursor = 'nwse-resize'; break;
                        case 'ne': case 'sw': cursor = 'nesw-resize'; break;
                        case 'n': case 's': cursor = 'ns-resize'; break;
                        case 'e': case 'w': cursor = 'ew-resize'; break;
                        default: cursor = 'auto';
                    }
                } else if (hoveredElement.type === 'image' || hoveredElement.type === 'text') {
                    cursor = 'grab';
                }
            }
            canvas.style.cursor = cursor;
        }
    }, [isDragging, selectedElement, dragOffset, isResizing, resizeStart, getElementAt, isAddingText, editingTextElement]);

    const handleCanvasMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeStart(null);
    }, []);

    useEffect(() => {
        window.addEventListener('mouseup', handleCanvasMouseUp);
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleCanvasMouseMove);
        }
        return () => {
            window.removeEventListener('mouseup', handleCanvasMouseUp);
            window.removeEventListener('mousemove', handleCanvasMouseMove);
        };
    }, [handleCanvasMouseUp, handleCanvasMouseMove, isDragging, isResizing]);

    const exportCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL();
    }, []);

    const timeoutRef = useRef(null);
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            const editorContent = {
                richText,
                images: images.map(img => ({
                    id: img.id, x: img.x, y: img.y, width: img.width, height: img.height, rotation: img.rotation, src: img.src
                })),
                textElements,
                canvasData: images.length > 0 || textElements.length > 0 ? exportCanvas() : null
            };
            if (onChange) {
                onChange(editorContent);
            }
        }, 300);
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [richText, images, textElements, onChange, exportCanvas]);

    const handleTextUpdate = (updatedElement) => {
        const targetId = editingTextElement ? editingTextElement.id : selectedElement?.id;
        if (targetId !== updatedElement.id) return;
        
        if (editingTextElement) {
            setEditingTextElement(updatedElement);
        }
        if (selectedElement) {
            setSelectedElement(updatedElement);
        }
        setTextElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
    };

    return (
        <div className="image-text-editor-wrapper" ref={editorWrapperRef}>
            <div className="image-text-editor" onPaste={handlePaste}>
                <div className="instructions">
                    <strong>Instructions:</strong> Paste or upload images. Use 'Add Text Box' to place text. Drag to move, use handles to resize. Double-click text to edit content.
                </div>
                
                <div className="selected-info-placeholder">
                    {selectedElement && (
                        <div className="selected-info">
                            Selected: {selectedElement.type === 'image' ? 'Image' : `Text: "${selectedElement.text}"`}
                        </div>
                    )}
                     {isAddingText && (
                        <div className="selected-info">Click on the canvas to place your text box.</div>
                    )}
                </div>

                <div className="editor-section">
                    <h4>📷 Image & Text Canvas</h4>

                    <TextToolbar
                        element={editingTextElement || selectedElement}
                        onUpdate={handleTextUpdate}
                    />

                    <div className="controls">
                        <button onClick={() => fileInputRef.current?.click()}>
                            📁 Upload Image
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }}/>

                        <button 
                            onClick={() => {
                                setIsAddingText(true);
                                setSelectedElement(null);
                            }}
                            className={isAddingText ? 'active' : ''}
                        >
                            🔤 Add Text Box
                        </button>

                        <div className="dynamic-controls">
                            <button className={`danger ${!selectedElement ? 'hidden-button' : ''}`} onClick={deleteSelected}>
                                🗑️ Delete Selected
                            </button>
                            <button className="danger" onClick={clearCanvas}>
                                🧹 Clear All
                            </button>
                        </div>
                    </div>

                    <div className="canvas-container">
                        <canvas
                            ref={canvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onDoubleClick={handleCanvasDoubleClick}
                        />
                        
                        {editingTextElement && (
                            <textarea
                                style={{
                                    position: 'absolute',
                                    left: `${canvasRef.current.offsetLeft + editingTextElement.x}px`,
                                    top: `${canvasRef.current.offsetTop + editingTextElement.y}px`,
                                    width: `${editingTextElement.width}px`,
                                    height: `${editingTextElement.height}px`,
                                    font: `${editingTextElement.fontStyle || 'normal'} ${editingTextElement.fontWeight || 'normal'} ${editingTextElement.fontSize}px ${editingTextElement.fontFamily || 'Arial'}`,
                                    color: editingTextElement.fill,
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    overflow: 'hidden',
                                    background: 'transparent',
                                    zIndex: 10,
                                    lineHeight: `${editingTextElement.fontSize * 1.2}px`,
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word',
                                }}
                                value={editingTextElement.text}
                                onChange={(e) => {
                                    handleTextUpdate({ ...editingTextElement, text: e.target.value });
                                }}
                                onBlur={() => {
                                    setSelectedElement(editingTextElement);
                                    setEditingTextElement(null);
                                }}
                                autoFocus
                            />
                        )}
                    </div>
                </div>

                <div className="editor-section">
                    <h4>📝 Rich Text Editor</h4>
                    <SimpleRichTextEditor
                        value={richText}
                        onChange={handleRichTextChange}
                        placeholder="Enter detailed description here..."
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageTextEditor;