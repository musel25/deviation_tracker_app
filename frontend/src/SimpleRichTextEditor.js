import React, { useState, useRef } from 'react';

const SimpleRichTextEditor = ({ value, onChange, placeholder = "Enter text here..." }) => {
  const [text, setText] = useState(value || '');
  const textareaRef = useRef(null);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    onChange && onChange(newText);
  };

  const insertText = (before, after = '') => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setText(newText);
    onChange && onChange(newText);
    
    // Restore focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const formatBold = () => insertText('**', '**');
  const formatItalic = () => insertText('*', '*');
  const formatUnderline = () => insertText('<u>', '</u>');
  const formatHeader = () => insertText('# ');
  const formatBullet = () => insertText('• ');
  const formatNumbered = () => insertText('1. ');

  return (
    <div className="simple-rich-text-editor">
      <style jsx>{`
        .simple-rich-text-editor {
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: white;
        }
        
        .toolbar {
          display: flex;
          gap: 5px;
          padding: 8px;
          border-bottom: 1px solid #ddd;
          background-color: #f8f9fa;
          flex-wrap: wrap;
        }
        
        .toolbar button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 3px;
          background-color: white;
          cursor: pointer;
          font-size: 14px;
          min-width: 32px;
          transition: background-color 0.2s;
        }
        
        .toolbar button:hover {
          background-color: #e9ecef;
        }
        
        .toolbar button:active {
          background-color: #dee2e6;
        }
        
        .toolbar .separator {
          width: 1px;
          background-color: #ddd;
          margin: 4px 4px;
        }
        
        .text-area {
          width: 100%;
          min-height: 200px;
          padding: 12px;
          border: none;
          resize: vertical;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          outline: none;
        }
        
        .format-help {
          padding: 8px 12px;
          background-color: #f8f9fa;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #6c757d;
        }
      `}</style>

      <div className="toolbar">
        <button onClick={formatBold} title="Bold (**text**)">
          <strong>B</strong>
        </button>
        <button onClick={formatItalic} title="Italic (*text*)">
          <em>I</em>
        </button>
        <button onClick={formatUnderline} title="Underline">
          <u>U</u>
        </button>
        
        <div className="separator"></div>
        
        <button onClick={formatHeader} title="Header (# text)">
          H1
        </button>
        <button onClick={formatBullet} title="Bullet point">
          •
        </button>
        <button onClick={formatNumbered} title="Numbered list">
          1.
        </button>
        
        <div className="separator"></div>
        
        <button 
          onClick={() => insertText('[', '](url)')} 
          title="Link ([text](url))"
        >
          🔗
        </button>
        <button 
          onClick={() => insertText('\n---\n')} 
          title="Horizontal line"
        >
          ―
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className="text-area"
        value={text}
        onChange={handleTextChange}
        placeholder={placeholder}
      />

      <div className="format-help">
        <strong>Formatting:</strong> **bold**, *italic*, # header, • bullets, [link](url)
      </div>
    </div>
  );
};

export default SimpleRichTextEditor;