// frontend/src/NewDeviationFormTest.js (Simple List Form Mock-up)

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from './AuthContext';
import ImageTextEditor from './ImageTextEditor';
import './NewDeviationFormTest.css'; // We'll simplify this CSS file next

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
    actions: [],
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

  // User autocomplete state and functionality
  const [allUsers, setAllUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const { accessToken, isAuthenticated } = useAuth();
  
  // Refs for input fields
  const originatorRef = useRef(null);
  const qualityMgrRef = useRef(null);
  const manufacturingEngineerRef = useRef(null);
  const prodEngMgrRef = useRef(null);
  const buyerPlannerRef = useRef(null);
  const plantManagerRef = useRef(null);
  const sbuProductMgrRef = useRef(null);
  const otherRef = useRef(null);
  const qualityDirectorRef = useRef(null);

  // Placeholder data for dropdowns/checkboxes (will be dynamic later)
  const plantOptions = [
    "005 LAM", "008 BUY", "013E EEX", "013S STL", "019 AZU", "020MX NMD",
    "025 OTY", "026 ELG", "028 TUC", "041 NOG", "047 TUC", "LORCA", "CHINA"
  ];
  const businessUnitOptions = [
    "ACC", "AG", "BUY", "CNTL", "COM", "CP", "CTR", "GLF", "LND", "SMD/PMP"
  ];

  // Effect to fetch all users for autocomplete suggestions
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetch('/api/users/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
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
    
    // Handle user autocomplete for specific fields
    const userFields = ['originator'];
    if (userFields.includes(field)) {
      handleUserFieldChange(field, value);
    }
  };

  const handleUserFieldChange = (field, value) => {
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
    
    // Handle user autocomplete for approval fields
    handleUserFieldChange(`approval_${field}`, value);
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
    }
    
    setSuggestedUsers([]);
    setActiveField(null);
  };

  const handleImageEditorChange = (editorContent) => {
    setFormData(prev => ({
      ...prev,
      deviationDetailsEditor: editorContent,
      deviationDetails: editorContent?.richText || ''
    }));
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = margin;
      
      // Helper function to add text with word wrapping
      const addText = (text, x = margin, fontSize = 10, fontStyle = 'normal') => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        doc.text(lines, x, yPos);
        yPos += lines.length * (fontSize * 0.4) + 5;
        return lines.length;
      };

      // Header
      addText('DEVIATION FORM', margin, 18, 'bold');
      addText(`Generated: ${new Date().toLocaleDateString()}`, margin, 10);
      yPos += 10;

      // Basic Information Section
      addText('BASIC INFORMATION', margin, 14, 'bold');
      if (formData.devNumber) addText(`DEV Number: ${formData.devNumber}`);
      if (formData.originator) addText(`Originator: ${formData.originator}`);
      if (formData.date) addText(`Date: ${formData.date}`);
      if (formData.plant) addText(`Plant: ${formData.plant}`);
      if (formData.businessUnit) addText(`Business Unit: ${formData.businessUnit}`);
      if (formData.dmrNum) addText(`DMR Number: ${formData.dmrNum}`);
      yPos += 5;

      // Deviation Type
      addText('DEVIATION TYPE', margin, 14, 'bold');
      if (formData.deviationType) {
        addText(`Type: ${formData.deviationType}`);
        if (formData.deviationType === 'EXTENSION' && formData.extensionDetails) {
          addText(`Extension Details: ${formData.extensionDetails}`);
        }
      }
      yPos += 5;

      // Dates
      addText('DATES', margin, 14, 'bold');
      if (formData.effectivityDate) addText(`Effectivity Date: ${formData.effectivityDate}`);
      if (formData.expirationDate) addText(`Expiration Date: ${formData.expirationDate}`);
      yPos += 5;

      // Affected Plants
      if (formData.affectedPlants && formData.affectedPlants.length > 0) {
        addText('AFFECTED MANUFACTURING PLANTS', margin, 14, 'bold');
        addText(`Plants: ${formData.affectedPlants.join(', ')}`);
        yPos += 5;
      }

      // Project Information
      if (formData.topLevelSku) {
        addText('PROJECT INFORMATION', margin, 14, 'bold');
        addText(`Top-Level SKU/Model Numbers: ${formData.topLevelSku}`);
        yPos += 5;
      }

      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = margin;
      }

      // Reason for Deviation
      if (formData.reasonForDeviation) {
        addText('REASON FOR DEVIATION', margin, 14, 'bold');
        addText(formData.reasonForDeviation);
        yPos += 5;
      }

      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = margin;
      }

      // Detailed Description
      if (formData.deviationDetails || formData.deviationDetailsEditor?.canvasData) {
        addText('DETAILED DESCRIPTION', margin, 14, 'bold');
        
        // Add rich text content
        if (formData.deviationDetails) {
          // Strip HTML tags for PDF (basic approach)
          const plainText = formData.deviationDetails.replace(/<[^>]*>/g, '');
          addText(plainText);
        }
        
        // Add canvas image if available
        if (formData.deviationDetailsEditor?.canvasData) {
          try {
            // Check if we need a new page for the image
            if (yPos > 200) {
              doc.addPage();
              yPos = margin;
            }
            
            // Add canvas image to PDF
            doc.addImage(
              formData.deviationDetailsEditor.canvasData,
              'PNG',
              margin,
              yPos,
              pageWidth - 2 * margin,
              100 // Fixed height, maintain aspect ratio
            );
            yPos += 110;
          } catch (error) {
            console.warn('Could not add canvas image to PDF:', error);
          }
        }
        
        yPos += 5;
      }

      // Approvals Section
      const hasApprovals = Object.values(formData.approvals).some(approval => approval.trim() !== '');
      if (hasApprovals) {
        // Check if we need a new page for approvals
        if (yPos > 180) {
          doc.addPage();
          yPos = margin;
        }
        
        addText('APPROVALS', margin, 14, 'bold');
        
        const approvalLabels = {
          qualityMgr: 'Quality Manager/Engineer',
          manufacturingEngineer: 'Manufacturing Engineer',
          prodEngMgr: 'Production/Plant Engineering Manager',
          buyerPlanner: 'Buyer/Planner',
          plantManager: 'Plant Manager',
          sbuProductMgr: 'SBU Product/Engineering Manager',
          other: 'Other',
          qualityDirector: 'Quality Director (Back-to-Back Deviations)'
        };

        Object.entries(formData.approvals).forEach(([key, value]) => {
          if (value.trim() !== '') {
            addText(`${approvalLabels[key]}: ${value}`);
          }
        });
      }

      // Generate filename and save
      const fileName = `deviation_${formData.devNumber || 'form'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      alert('PDF generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check the console for details.');
    }
  };

  return (
    <div className="new-deviation-form-container">
      <Link to="/" className="back-link">Back to All Deviations</Link>
      <h2>New Deviation Form (Simple Mock-up)</h2>
      <p className="form-intro-text">Fill out this form and click "Download as PDF" to generate a clean, formatted PDF document. No data will be saved to the database.</p>

      <div className="simple-form-layout"> {/* New class for simple layout */}

        {/* 1. DEV NUMBER: */}
        <div className="form-field-group">
          <label htmlFor="devNumber">1. DEV NUMBER:</label>
          <input 
            type="text" 
            id="devNumber" 
            placeholder="DEV-YY-XXXX" 
            value={formData.devNumber}
            onChange={(e) => handleInputChange('devNumber', e.target.value)}
          />
        </div>

        {/* 2. ORIGINATOR: (with dropdown to select users based on what its typed) */}
        <div className="form-field-group autocomplete-container">
          <label htmlFor="originator">2. ORIGINATOR:</label>
          <input 
            type="text" 
            id="originator" 
            placeholder="Search and select user..." 
            value={formData.originator}
            onChange={(e) => handleInputChange('originator', e.target.value)}
            ref={originatorRef}
            autoComplete="off"
          />
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

        {/* 3. DATE: */}
        <div className="form-field-group">
          <label htmlFor="date">3. DATE:</label>
          <input 
            type="date" 
            id="date" 
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
          />
        </div>

        {/* 4. PLANT (with a dropdown) */}
        <div className="form-field-group">
          <label htmlFor="plant">4. PLANT:</label>
          <select 
            id="plant" 
            value={formData.plant}
            onChange={(e) => handleInputChange('plant', e.target.value)}
          >
            <option value="">-- Select Plant --</option>
            {plantOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* 5. BUSINESS UNIT: (with a dropdown) */}
        <div className="form-field-group">
          <label htmlFor="businessUnit">5. BUSINESS UNIT:</label>
          <select 
            id="businessUnit"
            value={formData.businessUnit}
            onChange={(e) => handleInputChange('businessUnit', e.target.value)}
          >
            <option value="">-- Select Business Unit --</option>
            {businessUnitOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* 6. AFFECTED MFG PLANTS (WHERE USED): (checkboxes) */}
        <div className="form-field-group">
          <label>6. AFFECTED MFG PLANTS (WHERE USED):</label>
          <div className="checkbox-grid-mock">
            {plantOptions.map(plant => (
              <div className="checkbox-item-mock" key={`affected-plant-${plant}`}>
                <input 
                  type="checkbox" 
                  id={`affected-plant-${plant}`} 
                  checked={formData.affectedPlants.includes(plant)}
                  onChange={(e) => handlePlantChange(plant, e.target.checked)}
                />
                <label htmlFor={`affected-plant-${plant}`}>{plant}</label>
              </div>
            ))}
          </div>
        </div>

        {/* 7. EFFECTIVITY DATE: */}
        <div className="form-field-group">
          <label htmlFor="effectivityDate">7. EFFECTIVITY DATE:</label>
          <input 
            type="date" 
            id="effectivityDate" 
            value={formData.effectivityDate}
            onChange={(e) => handleInputChange('effectivityDate', e.target.value)}
          />
        </div>

        {/* 8. EXPIRATION DATE: */}
        <div className="form-field-group">
          <label htmlFor="expirationDate">8. EXPIRATION DATE:</label>
          <input 
            type="date" 
            id="expirationDate" 
            value={formData.expirationDate}
            onChange={(e) => handleInputChange('expirationDate', e.target.value)}
          />
        </div>

        {/* 9. DMR# (IF APPLICABLE): */}
        <div className="form-field-group">
          <label htmlFor="dmrNum">9. DMR# (IF APPLICABLE):</label>
          <input 
            type="text" 
            id="dmrNum" 
            value={formData.dmrNum}
            onChange={(e) => handleInputChange('dmrNum', e.target.value)}
          />
        </div>

        {/* 10. DEVIATION TYPE: (two checkboxes: NEW, EXTENSION. If extension is selected a field will appear) */}
        <div className="form-field-group">
          <label>10. DEVIATION TYPE:</label>
          <div className="checkbox-row">
            <input 
              type="radio" 
              id="devTypeNew" 
              name="deviationType"
              value="NEW"
              checked={formData.deviationType === 'NEW'}
              onChange={(e) => handleInputChange('deviationType', e.target.value)}
            /> 
            <label htmlFor="devTypeNew">NEW</label>
            <input 
              type="radio" 
              id="devTypeExtension" 
              name="deviationType"
              value="EXTENSION"
              checked={formData.deviationType === 'EXTENSION'}
              onChange={(e) => handleInputChange('deviationType', e.target.value)}
            /> 
            <label htmlFor="devTypeExtension">EXTENSION</label>
            {/* Conditional field */}
            {formData.deviationType === 'EXTENSION' && (
              <input 
                type="text" 
                placeholder="Extension details" 
                className="conditional-input-mock" 
                value={formData.extensionDetails}
                onChange={(e) => handleInputChange('extensionDetails', e.target.value)}
              />
            )}
          </div>
        </div>

        {/* 11. TOP-LEVEL SKU P/N(S) AND MODEL NUMBER(S): */}
        <div className="form-field-group">
          <label htmlFor="topLevelSku">11. TOP-LEVEL SKU P/N(S) AND MODEL NUMBER(S):</label>
          <textarea 
            id="topLevelSku" 
            rows="3"
            value={formData.topLevelSku}
            onChange={(e) => handleInputChange('topLevelSku', e.target.value)}
          ></textarea>
        </div>

        {/* 12. REASON FOR DEVIATION: */}
        <div className="form-field-group">
          <label htmlFor="reasonForDeviation">12. REASON FOR DEVIATION:</label>
          <textarea 
            id="reasonForDeviation" 
            rows="3"
            value={formData.reasonForDeviation}
            onChange={(e) => handleInputChange('reasonForDeviation', e.target.value)}
          ></textarea>
        </div>

        {/* 13. RISK ASSESSMENT / CORRECTIVE ACTION PLAN (NAMES & DATES) / COMMITMENT: (Actions) */}
        <div className="form-field-group">
          <label>13. RISK ASSESSMENT / CORRECTIVE ACTION PLAN (NAMES & DATES) / COMMITMENT:</label>
          <p className="section-description">(Here users will type the actions. It will dynamically add action forms.)</p>
          <div className="actions-section-mock">
            {/* Mock Action 1 */}
            <div className="mock-action-item">
              <p><strong>Action 1:</strong></p>
              <div className="action-fields-mock">
                <label>Description:</label><textarea rows="2" placeholder="Action Description"></textarea>
                <label>Responsible:</label><input type="text" placeholder="Search User..." />
                <label>Expiration Date:</label><input type="date" />
              </div>
            </div>
            {/* Mock Action 2 */}
            <div className="mock-action-item">
              <p><strong>Action 2:</strong></p>
              <div className="action-fields-mock">
                <label>Description:</label><textarea rows="2" placeholder="Action Description"></textarea>
                <label>Responsible:</label><input type="text" placeholder="Search User..." />
                <label>Expiration Date:</label><input type="date" />
              </div>
            </div>
            <button type="button" className="add-action-mock-button">Add Another Action</button>
          </div>
        </div>

        {/* 14. DRAWING INFO TABLE: */}
        <div className="form-field-group">
          <label>14. DRAWING INFO TABLE:</label>
          <div className="drawing-table-mock">
            <div className="drawing-table-header-mock">
                <span>DRAWING NUMBER</span>
                <span>DRAWING REVISION</span>
                <span>DEVIATION REVISION</span>
                <span>DRAWING TITLE / PART DESCRIPTION</span>
                <span>VENDOR</span>
            </div>
            {[...Array(6)].map((_, i) => ( // 6 rows as per your request
                <div className="drawing-table-row-mock" key={`drawing-row-${i}`}>
                    <input type="text" placeholder="" />
                    <input type="text" placeholder="" />
                    <input type="text" placeholder="" />
                    <input type="text" placeholder="" />
                    <input type="text" placeholder="" />
                </div>
            ))}
          </div>
        </div>

        {/* 15. DESCRIPTION OF DEVIATION (IS/WAS CONDITION AND DRAWING ZONE FOR EACH PART NO. OR ATTACH REDLINE PRINTS): */}
        <div className="form-field-group">
          <label htmlFor="deviationDetails">15. DESCRIPTION OF DEVIATION (IS/WAS CONDITION AND DRAWING ZONE FOR EACH PART NO. OR ATTACH REDLINE PRINTS):</label>
          <ImageTextEditor
            value={formData.deviationDetails}
            onChange={handleImageEditorChange}
          />
        </div>

        {/* 16. APPROVALS (Section Title) */}
        <div className="form-field-group">
          <label className="section-title-mock">16. APPROVALS</label>
        </div>

        {/* 17-23. APPROVAL FIELDS (User dropdowns) */}
        <div className="form-field-group autocomplete-container">
          <label htmlFor="qualityMgrApproval">17. QUALITY MGR. OR QUALITY ENG.:</label>
          <input 
            type="text" 
            id="qualityMgrApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.qualityMgr}
            onChange={(e) => handleApprovalChange('qualityMgr', e.target.value)}
            ref={qualityMgrRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_qualityMgr' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_qualityMgr', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-field-group autocomplete-container">
          <label htmlFor="manufacturingEngineerApproval">18. MANUFACTURING ENGINEER:</label>
          <input 
            type="text" 
            id="manufacturingEngineerApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.manufacturingEngineer}
            onChange={(e) => handleApprovalChange('manufacturingEngineer', e.target.value)}
            ref={manufacturingEngineerRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_manufacturingEngineer' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_manufacturingEngineer', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-field-group autocomplete-container">
          <label htmlFor="prodEngMgrApproval">19. PROD. ENG. MGR. OR PLANT ENG. MGR.:</label>
          <input 
            type="text" 
            id="prodEngMgrApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.prodEngMgr}
            onChange={(e) => handleApprovalChange('prodEngMgr', e.target.value)}
            ref={prodEngMgrRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_prodEngMgr' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_prodEngMgr', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-field-group autocomplete-container">
          <label htmlFor="buyerPlannerApproval">20. BUYER OR BUYER/ PLANNER:</label>
          <input 
            type="text" 
            id="buyerPlannerApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.buyerPlanner}
            onChange={(e) => handleApprovalChange('buyerPlanner', e.target.value)}
            ref={buyerPlannerRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_buyerPlanner' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_buyerPlanner', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-field-group autocomplete-container">
          <label htmlFor="plantManagerApproval">21. PLANT MANAGER:</label>
          <input 
            type="text" 
            id="plantManagerApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.plantManager}
            onChange={(e) => handleApprovalChange('plantManager', e.target.value)}
            ref={plantManagerRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_plantManager' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_plantManager', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-field-group autocomplete-container">
          <label htmlFor="sbuProductMgrApproval">22. SBU PRODUCT MGR. OR SBU ENG. MGR.:</label>
          <input 
            type="text" 
            id="sbuProductMgrApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.sbuProductMgr}
            onChange={(e) => handleApprovalChange('sbuProductMgr', e.target.value)}
            ref={sbuProductMgrRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_sbuProductMgr' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_sbuProductMgr', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-field-group autocomplete-container">
          <label htmlFor="otherApproval">22. OTHER:</label> {/* Note: You had two 22s, this is the second one */}
          <input 
            type="text" 
            id="otherApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.other}
            onChange={(e) => handleApprovalChange('other', e.target.value)}
            ref={otherRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_other' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_other', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-field-group autocomplete-container">
          <label htmlFor="qualityDirectorApproval">23. QUALITY DIRECTOR (REQUIRED FOR BACK TO BACK DEVIATIONS):</label>
          <input 
            type="text" 
            id="qualityDirectorApproval" 
            placeholder="Search and select user..." 
            value={formData.approvals.qualityDirector}
            onChange={(e) => handleApprovalChange('qualityDirector', e.target.value)}
            ref={qualityDirectorRef}
            autoComplete="off"
          />
          {suggestedUsers.length > 0 && activeField === 'approval_qualityDirector' && (
            <ul className="suggestions-list">
              {suggestedUsers.map(user => (
                <li key={user.id} onClick={() => handleSuggestionClick('approval_qualityDirector', user)}>
                  {user.first_name} {user.last_name} ({user.username})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buttons for the mock-up */}
        <div className="form-buttons-group">
          <button type="button" className="submit-button">Submit Mock Data</button>
          <button 
            type="button" 
            className="export-button" 
            onClick={generatePDF}
            style={{ 
              backgroundColor: '#dc3545', 
              color: 'white', 
              marginLeft: '10px',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📄 Download as PDF
          </button>
          <button type="button" className="cancel-button">Cancel Mock</button>
        </div>
      </div>
    </div>
  );
}

export default NewDeviationFormTest;
