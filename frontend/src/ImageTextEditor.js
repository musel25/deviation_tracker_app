import React, { useState, useRef, useCallback, useEffect } from 'react';
import SimpleRichTextEditor from './SimpleRichTextEditor';

const ImageTextEditor = ({ value, onChange }) => {
  const [images, setImages] = useState([]);
  const [textElements, setTextElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [richText, setRichText] = useState(value || '');
  const [newTextInput, setNewTextInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasSize = { width: 800, height: 600 };

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
        ctx.translate(img.x + img.width/2, img.y + img.height/2);
        ctx.rotate(img.rotation * Math.PI / 180);
        ctx.drawImage(
          img.htmlImage, 
          -img.width/2, 
          -img.height/2, 
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
          const handleSize = 8;
          ctx.fillStyle = '#007bff';
          ctx.fillRect(img.x - handleSize/2, img.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(img.x + img.width - handleSize/2, img.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(img.x - handleSize/2, img.y + img.height - handleSize/2, handleSize, handleSize);
          ctx.fillRect(img.x + img.width - handleSize/2, img.y + img.height - handleSize/2, handleSize, handleSize);
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
  }, [images, textElements, selectedElement, canvasSize]);

  // Redraw canvas when elements change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const maxSize = 200;
          let width = maxSize;
          let height = maxSize;
          
          if (aspectRatio > 1) {
            height = maxSize / aspectRatio;
          } else {
            width = maxSize * aspectRatio;
          }
          
          const newImage = {
            id: Date.now(),
            x: 50,
            y: 50,
            width: width,
            height: height,
            rotation: 0,
            htmlImage: img,
            src: event.target.result
          };
          setImages(prev => [...prev, newImage]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  }, []);

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

  const getElementAt = useCallback((x, y) => {
    // Check text elements first (they're drawn on top)
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
    
    // Check images
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      if (x >= img.x && x <= img.x + img.width &&
          y >= img.y && y <= img.y + img.height) {
        return { ...img, type: 'image' };
      }
    }
    
    return null;
  }, [images, textElements]);

  const handleCanvasMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const element = getElementAt(x, y);
    if (element) {
      setSelectedElement(element);
      setIsDragging(true);
      setDragOffset({ x: x - element.x, y: y - element.y });
    } else {
      setSelectedElement(null);
    }
  }, [getElementAt]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isDragging || !selectedElement) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newX = x - dragOffset.x;
    const newY = y - dragOffset.y;
    
    if (selectedElement.type === 'image') {
      setImages(prev => prev.map(img => 
        img.id === selectedElement.id ? { ...img, x: newX, y: newY } : img
      ));
    } else if (selectedElement.type === 'text') {
      setTextElements(prev => prev.map(text => 
        text.id === selectedElement.id ? { ...text, x: newX, y: newY } : text
      ));
    }
  }, [isDragging, selectedElement, dragOffset]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL();
  }, []);

  // Update parent component when content changes
  useEffect(() => {
    const editorContent = {
      richText,
      images: images.map(img => ({ ...img, htmlImage: null })), // Remove HTML image for serialization
      textElements,
      canvasData: images.length > 0 || textElements.length > 0 ? exportCanvas() : null
    };
    onChange && onChange(editorContent);
  }, [richText, images, textElements, onChange, exportCanvas]);

  return (
    <div className="image-text-editor">
      <style jsx>{`
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
        }
        
        .canvas-container canvas {
          display: block;
          cursor: crosshair;
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
        <strong>Instructions:</strong> Upload images (JPG, PNG, GIF) and add text overlays. Click elements to select them (highlighted in blue), then drag to move. Images are automatically resized to fit. Use the rich text editor below for additional formatted content.
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
            onMouseLeave={handleCanvasMouseUp}
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