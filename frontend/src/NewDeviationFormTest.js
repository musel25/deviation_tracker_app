import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // Import the autoTable function directly

import { useAuth } from './AuthContext';
import ImageTextEditor from './ImageTextEditor';
import './NewDeviationFormTest.css'; // Assume this CSS is still for the web form, not PDF design

function NewDeviationFormTest() {
    const [formData, setFormData] = useState({
        devNumber: '',
        originator: '',
        date: '',
        plant: '',
        businessUnit: '',
        affectedPlants: [],
        effectivityDate: '',
        expirationDate: '',
        dmrNum: '',
        deviationType: '',
        extensionDetails: '',
        topLevelSku: '',
        reasonForDeviation: '',
        actions: [{ id: Date.now(), description: '', responsible: [], expirationDate: '' }],
        drawingInfo: Array(6).fill({ drawingNumber: '', drawingRevision: '', deviationRevision: '', drawingTitle: '', vendor: '' }),
        deviationDetails: '',
        deviationDetailsEditor: null,
        approvals: {
            qualityMgr: '',
            manufacturingEngineer: '',
            prodEngMgr: '',
            buyerPlanner: '',
            plantManager: '',
            sbuProductMgr: '',
            other: '',
            qualityDirector: ''
        }
    });

    const [allUsers, setAllUsers] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [activeField, setActiveField] = useState(null);
    const { accessToken, isAuthenticated } = useAuth();

    const originatorRef = useRef(null);
    const approvalRefs = {
        qualityMgr: useRef(null),
        manufacturingEngineer: useRef(null),
        prodEngMgr: useRef(null),
        buyerPlanner: useRef(null),
        plantManager: useRef(null),
        sbuProductMgr: useRef(null),
        other: useRef(null),
        qualityDirector: useRef(null)
    };
    const actionResponsibleInputRefs = useRef({});

    const plantOptions = [
        "005 LAM", "008 BUY", "013E EEX", "013S STL", "019 AZU", "020MX NMD",
        "025 OTY", "026 ELG", "028 TUC", "041 NOG", "047 TUC", "CHINA"
    ];
    const businessUnitOptions = [
        "ACC", "AG", "BUY", "CNTL", "COM", "CP", "CTR", "GLF", "LND", "SMD/PMP"
    ];

    useEffect(() => {
        if (isAuthenticated && accessToken) {
            fetch('/api/users/', {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            })
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    setAllUsers(data);
                })
                .catch(error => {
                    console.error("Error fetching users for autocomplete:", error);
                });
        }
    }, [isAuthenticated, accessToken]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        const userFields = ['originator'];
        if (userFields.includes(field)) {
            handleUserFieldChange(field, value);
        }
    };

    const handleUserFieldChange = (field, value) => {
        if (field.startsWith('action_') && field.endsWith('_responsible_input')) {
            const actionId = parseInt(field.split('_')[1]);
            const currentAction = formData.actions.find(a => a.id === actionId);
            const selectedUsernames = currentAction ? currentAction.responsible.map(user => user.username.toLowerCase()) : [];

            if (value.length > 1) {
                const filtered = allUsers.filter(user =>
                    (!selectedUsernames.includes(user.username.toLowerCase())) &&
                    (user.username.toLowerCase().includes(value.toLowerCase()) ||
                        (user.first_name && user.first_name.toLowerCase().includes(value.toLowerCase())) ||
                        (user.last_name && user.last_name.toLowerCase().includes(value.toLowerCase())))
                );
                setSuggestedUsers(filtered);
                setActiveField(field);
            } else {
                setSuggestedUsers([]);
                setActiveField(null);
            }
        } else {
            if (value.length > 1) {
                const filtered = allUsers.filter(user =>
                    user.username.toLowerCase().includes(value.toLowerCase()) ||
                    (user.first_name && user.first_name.toLowerCase().includes(value.toLowerCase())) ||
                    (user.last_name && user.last_name.toLowerCase().includes(value.toLowerCase()))
                );
                setSuggestedUsers(filtered);
                setActiveField(field);
            } else {
                setSuggestedUsers([]);
                setActiveField(null);
            }
        }
    };

    const handlePlantChange = (plant, checked) => {
        setFormData(prev => ({
            ...prev,
            affectedPlants: checked
                ? [...prev.affectedPlants, plant]
                : prev.affectedPlants.filter(p => p !== plant)
        }));
    };

    const handleApprovalChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            approvals: { ...prev.approvals, [field]: value }
        }));
        handleUserFieldChange(`approval_${field}`, value);
    };

    const handleActionFieldChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            actions: prev.actions.map(action =>
                action.id === id ? { ...action, [field]: value } : action
            )
        }));
    };

    const handleAddAction = () => {
        setFormData(prev => ({
            ...prev,
            actions: [...prev.actions, { id: Date.now(), description: '', responsible: [], expirationDate: '' }]
        }));
    };

    const handleRemoveAction = (id) => {
        setFormData(prev => ({
            ...prev,
            actions: prev.actions.filter(action => action.id !== id)
        }));
        if (activeField && activeField.startsWith(`action_${id}`)) {
            setSuggestedUsers([]);
            setActiveField(null);
        }
    };

    const handleAddResponsible = (actionId, user) => {
        setFormData(prev => ({
            ...prev,
            actions: prev.actions.map(action =>
                action.id === actionId
                    ? { ...action, responsible: [...action.responsible, user] }
                    : action
            )
        }));
        setSuggestedUsers([]);
        setActiveField(null);
        if (actionResponsibleInputRefs.current[actionId]) {
            actionResponsibleInputRefs.current[actionId].value = '';
            actionResponsibleInputRefs.current[actionId].focus();
        }
    };

    const handleRemoveResponsible = (actionId, userIdToRemove) => {
        setFormData(prev => ({
            ...prev,
            actions: prev.actions.map(action =>
                action.id === actionId
                    ? { ...action, responsible: action.responsible.filter(user => user.id !== userIdToRemove) }
                    : action
            )
        }));
    };

    const handleSuggestionClick = (field, user) => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

        if (field === 'originator') {
            setFormData(prev => ({ ...prev, originator: fullName }));
        } else if (field.startsWith('approval_')) {
            const approvalField = field.replace('approval_', '');
            setFormData(prev => ({
                ...prev,
                approvals: { ...prev.approvals, [approvalField]: fullName }
            }));
        } else if (field.startsWith('action_') && field.endsWith('_responsible_input')) {
            const actionId = parseInt(field.split('_')[1]);
            handleAddResponsible(actionId, user);
        }

        setSuggestedUsers([]);
        setActiveField(null);
    };

    const handleImageEditorChange = useCallback((editorContent) => {
        setFormData(prev => ({
            ...prev,
            deviationDetailsEditor: editorContent,
            deviationDetails: editorContent?.richText || ''
        }));
    }, []);

    const handleDrawingInfoChange = (index, field, value) => {
        setFormData(prev => {
            const newDrawingInfo = [...prev.drawingInfo];
            newDrawingInfo[index] = { ...newDrawingInfo[index], [field]: value };
            return { ...prev, drawingInfo: newDrawingInfo };
        });
    };

    // Define helper functions outside generatePDF
    const addSectionTitle = (doc, title, y, fontSize = 12, align = 'left') => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        const textX = align === 'center' ? doc.internal.pageSize.getWidth() / 2 : 40; // Assuming margin 40 for left
        doc.text(title, textX, y, { align: align });
        return y + fontSize + 4;
    };

    const addKeyValuePair = (doc, label, value, x, y, labelWidth, valueWidth, labelFontSize = 8, valueFontSize = 8) => {
        doc.setFontSize(labelFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(label, x, y);

        doc.setFontSize(valueFontSize);
        doc.setFont('helvetica', 'normal');
        const textLines = doc.splitTextToSize(String(value || ''), valueWidth);
        doc.text(textLines, x + labelWidth, y);
        return Math.max(textLines.length * (valueFontSize * 1.1), labelFontSize * 1.1);
    };

    const addMultiLineTextContent = (doc, text, x, y, maxWidth, fontSize = 8) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'normal');
        const textLines = doc.splitTextToSize(String(text || ''), maxWidth);
        doc.text(textLines, x, y);
        return textLines.length * (fontSize * 1.1);
    };

    const drawHorizontalLine = (doc, y, x1, x2) => {
        doc.line(x1, y, x2, y);
    };

    const addSimpleText = (doc, text, x, y, fontSize = 8, fontStyle = 'normal', align = 'left') => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        if (align === 'center') {
            doc.text(String(text || ''), x, y, { align: 'center' });
        } else {
            doc.text(String(text || ''), x, y);
        }
    };


    const generatePDF = () => {
        try {
            const doc = new jsPDF('landscape', 'pt', 'letter');
            const pageWidth = doc.internal.pageSize.getWidth(); // 792 pt
            const pageHeight = doc.internal.pageSize.getHeight(); // 612 pt

            const margin = 40; // Standard margins
            const usableWidth = pageWidth - (2 * margin); // 792 - 80 = 712 pt
            let currentY = margin; // Current vertical position on the page

            doc.setLineWidth(0.4); // Thinner lines for a cleaner look

            // Helper to add content that might flow to new pages
            const checkPageBreak = (spaceNeeded) => {
                if (currentY + spaceNeeded > pageHeight - margin) {
                    doc.addPage();
                    currentY = margin;
                    // Add current page number and total pages (will be filled at the end)
                    addSimpleText(doc, `Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, margin - 10, 8, 'normal', 'right');
                }
            };


            // --- Document Title & Header ---
            currentY = addSectionTitle(doc, 'DEVIATION FORM - RAIN BIRD', currentY, 16, 'center');
            currentY += 5;
            // Place generated date at top right
            addSimpleText(doc, `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - margin, margin + 5, 7, 'normal', 'right');
            drawHorizontalLine(doc, currentY, margin, pageWidth - margin);
            currentY += 10;

            // --- Section: General Information ---
            checkPageBreak(100); // Estimate space for this section
            currentY = addSectionTitle(doc, '1. General Information', currentY);
            currentY += 3;

            const infoCol1X = margin;
            const infoCol2X = margin + usableWidth * 0.33;
            const infoCol3X = margin + usableWidth * 0.66;
            const labelWidth = 70;
            const valueWidth = usableWidth * 0.30 - labelWidth;

            let h;

            h = addKeyValuePair(doc, 'DEV Number:', formData.devNumber, infoCol1X, currentY, labelWidth, valueWidth);
            addKeyValuePair(doc, 'Originator:', formData.originator, infoCol2X, currentY, labelWidth, valueWidth);
            addKeyValuePair(doc, 'Date:', formData.date, infoCol3X, currentY, labelWidth, valueWidth); // Corrected this line
            currentY += h + 3;

            h = addKeyValuePair(doc, 'Plant:', formData.plant, infoCol1X, currentY, labelWidth, valueWidth);
            addKeyValuePair(doc, 'Business Unit:', formData.businessUnit, infoCol2X, currentY, labelWidth, valueWidth);
            addKeyValuePair(doc, 'DMR #:', formData.dmrNum, infoCol3X, currentY, labelWidth, valueWidth);
            currentY += h + 3;

            h = addKeyValuePair(doc, 'Effectivity Date:', formData.effectivityDate, infoCol1X, currentY, labelWidth + 10, valueWidth - 10);
            addKeyValuePair(doc, 'Expiration Date:', formData.expirationDate, infoCol2X, currentY, labelWidth + 10, valueWidth - 10);
            currentY += h + 8;

            // Deviation Type
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('Deviation Type:', infoCol1X, currentY);

            const checkboxSize = 6;
            const checkboxPadding = 2;
            const checkboxYOffset = currentY - 4;

            let currentCheckboxX = infoCol1X + 80;
            doc.rect(currentCheckboxX, checkboxYOffset, checkboxSize, checkboxSize);
            addSimpleText(doc, 'NEW', currentCheckboxX + checkboxSize + checkboxPadding, currentY + 1, 8);
            if (formData.deviationType === 'NEW') {
                doc.setFont('zapfdingbats', 'normal');
                doc.text('4', currentCheckboxX + 1, currentY + 1);
                doc.setFont('helvetica', 'normal');
            }

            currentCheckboxX += 50;
            doc.rect(currentCheckboxX, checkboxYOffset, checkboxSize, checkboxSize);
            addSimpleText(doc, 'EXTENSION', currentCheckboxX + checkboxSize + checkboxPadding, currentY + 1, 8);
            if (formData.deviationType === 'EXTENSION') {
                doc.setFont('zapfdingbats', 'normal');
                doc.text('4', currentCheckboxX + 1, currentY + 1);
                doc.setFont('helvetica', 'normal');
                addSimpleText(doc, `OF DEV#: ${String(formData.extensionDetails || '')}`, currentCheckboxX + 60, currentY + 1, 8);
            }
            currentY += 15;

            drawHorizontalLine(doc, currentY, margin, pageWidth - margin);
            currentY += 10;


            // --- Section: Affected Manufacturing Plants ---
            checkPageBreak(60);
            currentY = addSectionTitle(doc, '2. Affected Manufacturing Plants (Where Used)', currentY);
            currentY += 3;

            const plantsColWidth = usableWidth / 4;
            let plantsCurrentY = currentY;
            const checkboxLineSpace = 10;
            const plantCheckboxSize = 5;
            const plantTextSize = 7;

            const sortedPlantOptions = [...plantOptions].sort();

            let plantsPerColumn = Math.ceil(sortedPlantOptions.length / 4);
            if (plantsPerColumn < 3) plantsPerColumn = 3;

            for (let i = 0; i < sortedPlantOptions.length; i++) {
                const plant = sortedPlantOptions[i];
                const colIndex = Math.floor(i / plantsPerColumn);
                const rowIndex = i % plantsPerColumn;

                const xPos = margin + (colIndex * plantsColWidth);
                const yPos = plantsCurrentY + (rowIndex * checkboxLineSpace);

                doc.rect(xPos, yPos - 4, plantCheckboxSize, plantCheckboxSize);
                addSimpleText(doc, plant, xPos + plantCheckboxSize + 3, yPos + 1, plantTextSize);
                if (formData.affectedPlants.includes(plant)) {
                    doc.setFont('zapfdingbats', 'normal');
                    doc.text('4', xPos + 1, yPos + 2);
                    doc.setFont('helvetica', 'normal');
                }
            }
            currentY = plantsCurrentY + (plantsPerColumn * checkboxLineSpace) + 10;

            drawHorizontalLine(doc, currentY, margin, pageWidth - margin);
            currentY += 10;

            // --- Section: Project & SKU Information ---
            checkPageBreak(50);
            currentY = addSectionTitle(doc, '3. Project & Top-Level SKU Information', currentY);
            currentY += 3;

            h = addKeyValuePair(doc, 'Project Name or No. (Optional):', formData.projectNumber || formData.topLevelSku, margin, currentY, 150, usableWidth - 160);
            currentY += h + 3;
            h = addKeyValuePair(doc, 'Top-Level SKU P/N(s) and Model Number(s):', formData.topLevelSku, margin, currentY, 150, usableWidth - 160);
            currentY += h + 10;

            drawHorizontalLine(doc, currentY, margin, pageWidth - margin);
            currentY += 10;

            // --- Section: Reason for Deviation ---
            checkPageBreak(80);
            currentY = addSectionTitle(doc, '4. Reason for Deviation', currentY);
            currentY += 3;
            const reasonTextHeight = addMultiLineTextContent(doc, formData.reasonForDeviation, margin, currentY, usableWidth, 9);
            currentY += reasonTextHeight + 10;

            drawHorizontalLine(doc, currentY, margin, pageWidth - margin);
            currentY += 10;

            // --- Section: Risk Assessment / Corrective Action Plan ---
            checkPageBreak(120);
            currentY = addSectionTitle(doc, '5. Risk Assessment / Corrective Action Plan / Commitment', currentY);
            currentY += 3;

            formData.actions.forEach((action, index) => {
                checkPageBreak(50); // Check page break before each action item
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(`Action ${index + 1}:`, margin + 5, currentY);
                currentY += 10;

                const detailsX = margin + 15;
                const detailsWidth = usableWidth - 15;

                let consumedHeight = addMultiLineTextContent(doc, `Description: ${String(action.description || '')}`, detailsX, currentY, detailsWidth, 7);
                currentY += consumedHeight + 2;

                const responsibleNames = action.responsible.map(user => `${user.first_name || ''} ${user.last_name || ''}`).filter(Boolean).join(', ');
                consumedHeight = addMultiLineTextContent(doc, `Responsible: ${responsibleNames}`, detailsX, currentY, detailsWidth, 7);
                currentY += consumedHeight + 2;

                consumedHeight = addMultiLineTextContent(doc, `Expiration Date: ${String(action.expirationDate || '')}`, detailsX, currentY, detailsWidth, 7);
                currentY += consumedHeight + 6;
            });
            currentY += 5;

            drawHorizontalLine(doc, currentY, margin, pageWidth - margin);
            currentY += 10;


            // --- Section: Drawing Information Table ---
            checkPageBreak(150);
            currentY = addSectionTitle(doc, '6. Drawing Information', currentY);
            currentY += 3;

            autoTable(doc, {
                startY: currentY,
                head: [
                    [
                        { content: 'DRAWING NUMBER', styles: { fontStyle: 'bold' } },
                        { content: 'REVISION', styles: { fontStyle: 'bold' } },
                        { content: 'DEV. REV.', styles: { fontStyle: 'bold' } },
                        { content: 'TITLE / DESCRIPTION', styles: { fontStyle: 'bold' } },
                        { content: 'VENDOR', styles: { fontStyle: 'bold' } }
                    ]
                ],
                body: formData.drawingInfo.map(row => [
                    String(row.drawingNumber || ''),
                    String(row.drawingRevision || ''),
                    String(row.deviationRevision || ''),
                    String(row.drawingTitle || ''),
                    String(row.vendor || '')
                ]),
                theme: 'striped',
                tableWidth: usableWidth,
                margin: { left: margin, right: margin },
                styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [180, 180, 180] },
                bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [220, 220, 220] },
                columnStyles: {
                    0: { cellWidth: usableWidth * 0.18 },
                    1: { cellWidth: usableWidth * 0.12 },
                    2: { cellWidth: usableWidth * 0.12 },
                    3: { cellWidth: usableWidth * 0.40 },
                    4: { cellWidth: usableWidth * 0.18 }
                },
                didDrawPage: function(data) {
                    if (data.pageNumber > 1) {
                        doc.setFontSize(8);
                        doc.text(`Drawing Information (Cont.) - Page ${data.pageNumber}`, margin, margin - 10);
                    }
                }
            });
            currentY = doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 10 : currentY + (6 * 15) + 30;


            // --- Section: Approvals ---
            checkPageBreak(150);
            currentY = addSectionTitle(doc, '7. Approvals', currentY);
            currentY += 3;

            const approvalColWidth = usableWidth / 2;
            const approvalLineLength = approvalColWidth - 20;

            const approvalFields = [
                { key: 'qualityMgr', label: 'Quality Manager / Quality Engineer:' },
                { key: 'manufacturingEngineer', label: 'Manufacturing Engineer:' },
                { key: 'prodEngMgr', label: 'Prod. Eng. Mgr. / Plant Eng. Mgr.:' },
                { key: 'buyerPlanner', label: 'Buyer / Buyer/Planner:' },
                { key: 'plantManager', label: 'Plant Manager:' },
                { key: 'sbuProductMgr', label: 'SBU Product Mgr. / SBU Eng. Mgr.:' },
                { key: 'other', label: 'Other:' },
                { key: 'qualityDirector', label: 'Quality Director (Required for Back-to-Back Deviations):' }
            ];

            let leftColApprovalY = currentY;
            let rightColApprovalY = currentY;

            approvalFields.forEach((field, index) => {
                const isLeftColumn = index % 2 === 0;
                let colX = isLeftColumn ? margin : margin + approvalColWidth;
                let colY = isLeftColumn ? leftColApprovalY : rightColApprovalY;

                checkPageBreak(50); // Each approval field needs approx 50pt of space

                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                const labelLines = doc.splitTextToSize(field.label, approvalLineLength);
                doc.text(labelLines, colX, colY);
                let labelHeight = labelLines.length * 8;

                doc.setFont('helvetica', 'normal');
                const valueLines = doc.splitTextToSize(String(formData.approvals[field.key] || ''), approvalLineLength);
                doc.text(valueLines, colX, colY + labelHeight + 2);
                let valueHeight = valueLines.length * 8;

                doc.line(colX, colY + labelHeight + valueHeight + 6, colX + approvalLineLength, colY + labelHeight + valueHeight + 6);

                const totalConsumedHeight = labelHeight + valueHeight + 12;

                if (isLeftColumn) {
                    leftColApprovalY += totalConsumedHeight;
                } else {
                    rightColApprovalY += totalConsumedHeight;
                }
                currentY = Math.max(leftColApprovalY, rightColApprovalY);
            });
            currentY = Math.max(leftColApprovalY, rightColApprovalY) + 10;


            // --- Section: Description of Deviation (MOVED TO END) ---
            checkPageBreak(100); // Check for page break before this section
            currentY = addSectionTitle(doc, '8. Description of Deviation (Is/Was Condition & Redline Prints)', currentY);
            currentY += 3;

            // This section can take multiple pages if needed.
            let descriptionContentHeight = 0;
            const contentStartX = margin + 5;
            const contentMaxWidth = usableWidth - 10;

            if (formData.deviationDetailsEditor?.canvasData) {
                const imageData = formData.deviationDetailsEditor.canvasData;

                console.log("Attempting to add image to PDF for Section 8 (end):");
                console.log("Image Data presence:", !!imageData);
                if (imageData) {
                    console.log("Image Data starts with:", imageData.substring(0, 50));
                    console.log("Image Data length:", imageData.length);
                }

                try {
                    const imageProps = doc.getImageProperties(imageData);
                    const imgWidth = imageProps.width;
                    const imgHeight = imageProps.height;
                    const aspectRatio = imgWidth / imgHeight;

                    // Calculate max dimensions based on available page height
                    const maxDisplayWidth = contentMaxWidth;
                    let displayHeight = maxDisplayWidth / aspectRatio;
                    let displayWidth = maxDisplayWidth;

                    // If image height exceeds remaining page height, split it or add new page
                    if (currentY + displayHeight + 5 > pageHeight - margin) { // +5 for some padding
                        doc.addPage();
                        currentY = margin;
                        // Recalculate height for the new page
                        const remainingHeightOnNewPage = pageHeight - margin - currentY - 5;
                        if (displayHeight > remainingHeightOnNewPage) {
                            displayHeight = remainingHeightOnNewPage;
                            displayWidth = displayHeight * aspectRatio;
                        }
                    }

                    const imgX = margin + (usableWidth - displayWidth) / 2; // Center image
                    const imgY = currentY + 2; // Start adding from current Y

                    doc.addImage(
                        imageData,
                        'PNG', // Or 'JPEG' depending on your canvas export
                        imgX,
                        imgY,
                        displayWidth,
                        displayHeight
                    );
                    currentY += displayHeight + 5; // Update Y after image
                    console.log("Image added successfully. New currentY:", currentY);

                } catch (error) {
                    console.error('Error adding image to PDF from canvasData:', error);
                    currentY += addMultiLineTextContent(doc, '(Image content could not be rendered from canvas. Check console for details.)', contentStartX, currentY + 5, contentMaxWidth, 8, 'italic');
                }
            } else if (formData.deviationDetails) {
                // For plain text, allow it to flow across pages automatically
                // jsPDF's text() with splitTextToSize will continue on a new page IF you handle currentY correctly.
                // For a long text block, we can use `text(text, x, y, { maxWidth: ..., align: 'left', renderingMode: 'fill', callback: (result) => { currentY = result.finalY; } });`
                // But a simpler way for multi-page flow is just to manage `currentY` and add pages as needed.

                const textLines = doc.splitTextToSize(formData.deviationDetails.replace(/<[^>]*>/g, ''), contentMaxWidth);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');

                textLines.forEach(line => {
                    checkPageBreak(doc.getFontSize() * 1.1); // Check space for each line
                    doc.text(line, contentStartX, currentY);
                    currentY += doc.getFontSize() * 1.1; // Increment Y for the next line
                });
                currentY += 5; // Padding after text block
            }
            // No need to draw a final line after this section as it's the last.


            // Add page numbers at the bottom of each page
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - margin + 15, { align: 'center' });
            }


            const fileName = `deviation_${formData.devNumber || 'form'}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            console.log('PDF generated and downloaded successfully!');
            alert('PDF generated and downloaded successfully! Check console for debug info.');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please check the console for details.');
        }
    };

    return (
        <div className="new-deviation-form-container">
            <Link to="/" className="back-link">Back to All Deviations</Link>
            <h2>New Deviation Form (Clean Layout)</h2>
            <p className="form-intro-text">Fill out this form and click "Download as PDF" to generate a clean, formatted PDF document. No data will be saved to the database.</p>

            {/* The HTML form structure remains the same as it correctly collects data */}
            <div className="simple-form-layout">
                <div className="form-field-group">
                    <label htmlFor="devNumber">1. DEV NUMBER:</label>
                    <input type="text" id="devNumber" placeholder="DEV-YY-XXXX" value={formData.devNumber} onChange={(e) => handleInputChange('devNumber', e.target.value)} />
                </div>

                <div className="form-field-group autocomplete-container">
                    <label htmlFor="originator">2. ORIGINATOR:</label>
                    <input type="text" id="originator" placeholder="Search and select user..." value={formData.originator} onChange={(e) => handleInputChange('originator', e.target.value)} ref={originatorRef} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'originator' && (
                        <ul className="suggestions-list">
                            {suggestedUsers.map(user => (
                                <li key={user.id} onClick={() => handleSuggestionClick('originator', user)}>
                                    {user.first_name} {user.last_name} ({user.username})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="form-field-group">
                    <label htmlFor="date">3. DATE:</label>
                    <input type="date" id="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} />
                </div>

                <div className="form-field-group">
                    <label htmlFor="plant">4. PLANT:</label>
                    <select id="plant" value={formData.plant} onChange={(e) => handleInputChange('plant', e.target.value)}>
                        <option value="">-- Select Plant --</option>
                        {plantOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                    </select>
                </div>

                <div className="form-field-group">
                    <label htmlFor="businessUnit">5. BUSINESS UNIT (SBU and PLANT) W/ PRIMARY DESIGN CONTRO SHEET:</label>
                    <select id="businessUnit" value={formData.businessUnit} onChange={(e) => handleInputChange('businessUnit', e.target.value)}>
                        <option value="">-- Select Business Unit --</option>
                        {businessUnitOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                    </select>
                </div>

                <div className="form-field-group">
                    <label>6. AFFECTED MFG PLANTS (WHERE USED):</label>
                    <div className="checkbox-grid-mock">
                        {plantOptions.map(plant => (
                            <div className="checkbox-item-mock" key={`affected-plant-${plant}`}>
                                <input type="checkbox" id={`affected-plant-${plant}`} checked={formData.affectedPlants.includes(plant)} onChange={(e) => handlePlantChange(plant, e.target.checked)} />
                                <label htmlFor={`affected-plant-${plant}`}>{plant}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-field-group">
                    <label htmlFor="effectivityDate">7. EFFECTIVITY DATE:</label>
                    <input type="date" id="effectivityDate" value={formData.effectivityDate} onChange={(e) => handleInputChange('effectivityDate', e.target.value)} />
                </div>

                <div className="form-field-group">
                    <label htmlFor="expirationDate">8. EXPIRATION DATE:</label>
                    <input type="date" id="expirationDate" value={formData.expirationDate} onChange={(e) => handleInputChange('expirationDate', e.target.value)} />
                </div>

                <div className="form-field-group">
                    <label htmlFor="dmrNum">9. DMR# (IF APPLICABLE):</label>
                    <input type="text" id="dmrNum" value={formData.dmrNum} onChange={(e) => handleInputChange('dmrNum', e.target.value)} />
                </div>

                <div className="form-field-group">
                    <label>10. DEVIATION TYPE:</label>
                    <div className="checkbox-row">
                        <input type="radio" id="devTypeNew" name="deviationType" value="NEW" checked={formData.deviationType === 'NEW'} onChange={(e) => handleInputChange('deviationType', e.target.value)} />
                        <label htmlFor="devTypeNew">NEW</label>
                        <input type="radio" id="devTypeExtension" name="deviationType" value="EXTENSION" checked={formData.deviationType === 'EXTENSION'} onChange={(e) => handleInputChange('deviationType', e.target.value)} />
                        <label htmlFor="devTypeExtension">EXTENSION</label>
                        {formData.deviationType === 'EXTENSION' && (<input type="text" placeholder="Extension details" className="conditional-input-mock" value={formData.extensionDetails} onChange={(e) => handleInputChange('extensionDetails', e.target.value)} />)}
                    </div>
                </div>

                <div className="form-field-group">
                    <label htmlFor="topLevelSku">11. TOP-LEVEL SKU P/N(S) AND MODEL NUMBER(S):</label>
                    <textarea id="topLevelSku" rows="3" value={formData.topLevelSku} onChange={(e) => handleInputChange('topLevelSku', e.target.value)}></textarea>
                </div>

                <div className="form-field-group">
                    <label htmlFor="reasonForDeviation">12. REASON FOR DEVIATION:</label>
                    <textarea id="reasonForDeviation" rows="3" value={formData.reasonForDeviation} onChange={(e) => handleInputChange('reasonForDeviation', e.target.value)}></textarea>
                </div>

                {/* 13. RISK ASSESSMENT / CORRECTIVE ACTION PLAN (NAMES & DATES) / COMMITMENT: (Actions) */}
                <div className="form-field-group">
                    <label>13. RISK ASSESSMENT / CORRECTIVE ACTION PLAN (NAMES & DATES) / COMMITMENT:</label>
                    <div className="actions-section-mock">
                        {formData.actions.map((action, index) => (
                            <div className="mock-action-item" key={action.id}>
                                <div className="action-header">
                                    <p><strong>Action {index + 1}:</strong></p>
                                    {formData.actions.length > 1 && (
                                        <button type="button" className="remove-action-button" onClick={() => handleRemoveAction(action.id)}>Remove</button>
                                    )}
                                </div>
                                <div className="action-fields-mock">
                                    <label htmlFor={`action-description-${action.id}`}>Description:</label>
                                    <textarea id={`action-description-${action.id}`} rows="2" placeholder="Action Description" value={action.description} onChange={(e) => handleActionFieldChange(action.id, 'description', e.target.value)}></textarea>

                                    {/* Multi-selection for Responsible */}
                                    <label htmlFor={`action-responsible-input-${action.id}`}>Responsible:</label>
                                    <div className="responsible-multi-select-container">
                                        <div className="selected-users-tags">
                                            {action.responsible.map(user => (
                                                <span key={user.id} className="user-tag">
                                                    {user.first_name} {user.last_name}
                                                    <button type="button" className="remove-tag-button" onClick={() => handleRemoveResponsible(action.id, user.id)}>x</button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="autocomplete-container">
                                            <input
                                                type="text"
                                                id={`action-responsible-input-${action.id}`}
                                                placeholder="Add user..."
                                                onChange={(e) => handleUserFieldChange(`action_${action.id}_responsible_input`, e.target.value)}
                                                ref={el => actionResponsibleInputRefs.current[action.id] = el}
                                                autoComplete="off"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && suggestedUsers.length > 0 && activeField === `action_${action.id}_responsible_input`) {
                                                        e.preventDefault();
                                                        handleAddResponsible(action.id, suggestedUsers[0]);
                                                    }
                                                }}
                                            />
                                            {suggestedUsers.length > 0 && activeField === `action_${action.id}_responsible_input` && (
                                                <ul className="suggestions-list">
                                                    {suggestedUsers.map(user => (
                                                        <li key={user.id} onClick={() => handleSuggestionClick(`action_${action.id}_responsible_input`, user)}>
                                                            {user.first_name} {user.last_name} ({user.username})
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <label htmlFor={`action-expiration-${action.id}`}>Expiration Date:</label>
                                    <input type="date" id={`action-expiration-${action.id}`} value={action.expirationDate} onChange={(e) => handleActionFieldChange(action.id, 'expirationDate', e.target.value)} />
                                </div>
                            </div>
                        ))}
                        <button type="button" className="add-action-mock-button" onClick={handleAddAction}>Add Another Action</button>
                    </div>
                </div>

                <div className="form-field-group">
                    <label>14. DRAWING INFO TABLE:</label>
                    <div className="drawing-table-mock">
                        <div className="drawing-table-header-mock">
                            <span>DRAWING NUMBER:</span>
                            <span>DRAWING REVISION:</span>
                            <span>DEVIATION REVISION:</span>
                            <span>DRAWING TITLE/PART DESCRIPTION:</span>
                            <span>VENDOR:</span>
                        </div>
                        {[...Array(6)].map((_, i) => (
                            <div className="drawing-table-row-mock" key={`drawing-row-${i}`}>
                                <input type="text" placeholder="" value={formData.drawingInfo[i].drawingNumber} onChange={(e) => handleDrawingInfoChange(i, 'drawingNumber', e.target.value)} />
                                <input type="text" placeholder="" value={formData.drawingInfo[i].drawingRevision} onChange={(e) => handleDrawingInfoChange(i, 'drawingRevision', e.target.value)} />
                                <input type="text" placeholder="" value={formData.drawingInfo[i].deviationRevision} onChange={(e) => handleDrawingInfoChange(i, 'deviationRevision', e.target.value)} />
                                <input type="text" placeholder="" value={formData.drawingInfo[i].drawingTitle} onChange={(e) => handleDrawingInfoChange(i, 'drawingTitle', e.target.value)} />
                                <input type="text" placeholder="" value={formData.drawingInfo[i].vendor} onChange={(e) => handleDrawingInfoChange(i, 'vendor', e.target.value)} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-field-group">
                    <label htmlFor="deviationDetails">15. DESCRIPTION OF DEVIATION (IS/WAS CONDITION AND DRAWING ZONE FOR EACH PART NO. OR ATTACH REDLINE PRINTS):</label>
                    <ImageTextEditor value={formData.deviationDetailsEditor?.richText || ''} onChange={handleImageEditorChange} />
                </div>

                <div className="form-field-group">
                    <label className="section-title-mock">16. APPROVALS (ALL REQUIRED):</label>
                </div>

                {/* Approval fields remain single select */}
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="qualityMgrApproval">17. QUALITY MGR. OR QUALITY ENG.:</label>
                    <input type="text" id="qualityMgrApproval" placeholder="Search and select user..." value={formData.approvals.qualityMgr} onChange={(e) => handleApprovalChange('qualityMgr', e.target.value)} ref={approvalRefs.qualityMgr} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_qualityMgr' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_qualityMgr', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="manufacturingEngineerApproval">18. MANUFACTURING ENGINEER:</label>
                    <input type="text" id="manufacturingEngineerApproval" placeholder="Search and select user..." value={formData.approvals.manufacturingEngineer} onChange={(e) => handleApprovalChange('manufacturingEngineer', e.target.value)} ref={approvalRefs.manufacturingEngineer} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_manufacturingEngineer' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_manufacturingEngineer', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="prodEngMgrApproval">19. PROD. ENG. MGR. OR PLANT ENG. MGR.:</label>
                    <input type="text" id="prodEngMgrApproval" placeholder="Search and select user..." value={formData.approvals.prodEngMgr} onChange={(e) => handleApprovalChange('prodEngMgr', e.target.value)} ref={approvalRefs.prodEngMgr} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_prodEngMgr' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_prodEngMgr', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="buyerPlannerApproval">20. BUYER OR BUYER/ PLANNER:</label>
                    <input type="text" id="buyerPlannerApproval" placeholder="Search and select user..." value={formData.approvals.buyerPlanner} onChange={(e) => handleApprovalChange('buyerPlanner', e.target.value)} ref={approvalRefs.buyerPlanner} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_buyerPlanner' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_buyerPlanner', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="plantManagerApproval">21. PLANT MANAGER:</label>
                    <input type="text" id="plantManagerApproval" placeholder="Search and select user..." value={formData.approvals.plantManager} onChange={(e) => handleApprovalChange('plantManager', e.target.value)} ref={approvalRefs.plantManager} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_plantManager' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_plantManager', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="sbuProductMgrApproval">22. SBU PRODUCT MGR. OR SBU ENG. MGR.:</label>
                    <input type="text" id="sbuProductMgrApproval" placeholder="Search and select user..." value={formData.approvals.sbuProductMgr} onChange={(e) => handleApprovalChange('sbuProductMgr', e.target.value)} ref={approvalRefs.sbuProductMgr} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_sbuProductMgr' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_sbuProductMgr', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="otherApproval">22. OTHER:</label>
                    <input type="text" id="otherApproval" placeholder="Search and select user..." value={formData.approvals.other} onChange={(e) => handleApprovalChange('other', e.target.value)} ref={approvalRefs.other} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_other' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_other', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>
                <div className="form-field-group autocomplete-container">
                    <label htmlFor="qualityDirectorApproval">23. QUALITY DIRECTOR (REQUIRED FOR BACK TO BACK DEVIATIONS):</label>
                    <input type="text" id="qualityDirectorApproval" placeholder="Search and select user..." value={formData.approvals.qualityDirector} onChange={(e) => handleApprovalChange('qualityDirector', e.target.value)} ref={approvalRefs.qualityDirector} autoComplete="off" />
                    {suggestedUsers.length > 0 && activeField === 'approval_qualityDirector' && (<ul className="suggestions-list">{suggestedUsers.map(user => (<li key={user.id} onClick={() => handleSuggestionClick('approval_qualityDirector', user)}>{user.first_name} {user.last_name} ({user.username})</li>))}</ul>)}
                </div>

                <div className="form-buttons-group">
                    <button type="button" className="submit-button">Submit Mock Data</button>
                    <button type="button" className="export-button" onClick={generatePDF} style={{ backgroundColor: '#dc3545', color: 'white', marginLeft: '10px', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📄 Download as PDF</button>
                    <button type="button" className="cancel-button">Cancel Mock</button>
                </div>
            </div>
        </div>
    );
}

export default NewDeviationFormTest;