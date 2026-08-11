/**
 * Daily Collection Page
 * Dynamically switches layout based on ownerRole:
 * - dairy_owner: new 5-card detailed entry page (DailyCollectionDailyOwner)
 * - milk_supplier / default: original intake & quota assignment page (DailyCollectionMilkSupplier)
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Droplets,
  Users,
  Save,
  Printer,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import useWindowWidth from '../../hooks/useWindowWidth';
import useThrottle from '../../hooks/useThrottle';
import { useMarathi } from '../../i18n/marathi';
import { useAuth } from '../../context/AuthContext';
import { FarmerModal } from './Farmers';

// ── DAILY OWNER DETAILED 5-CARD LAYOUT ──────────────────────────────────────────
const DailyCollectionDailyOwner = () => {
  const toast = useToast();
  const { isMarathi } = useMarathi();
  const { user } = useAuth();
  const apiPrefix = user?.role === 'staff' ? '/staff' : '/owner';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Header State
  const [date, setDate] = useState(getLocalDateStr);
  const [time, setTime] = useState(() => new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [shift, setShift] = useState(() => {
    const hour = new Date().getHours();
    return hour < 14 ? 'Morning' : 'Evening';
  });
  const [centerName, setCenterName] = useState(() => localStorage.getItem('amrit_center_name') || '');
  const [collectionNumber, setCollectionNumber] = useState('');

  // Farmers List & Search State
  const [farmers, setFarmers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [farmerCodeQuery, setFarmerCodeQuery] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [showAddFarmerModal, setShowAddFarmerModal] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Milk Entry State
  const [milkType, setMilkType] = useState('Cow');
  const [quantity, setQuantity] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [clr, setClr] = useState('');
  const [notes, setNotes] = useState('');

  // Pricing & Summary state
  const [baseRate, setBaseRate] = useState(35);
  const [fatBonus, setFatBonus] = useState(0);
  const [snfBonus, setSnfBonus] = useState(0);
  const [finalRate, setFinalRate] = useState(35);

  const [grossAmount, setGrossAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [deductionAmount, setDeductionAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [hasRateConfig, setHasRateConfig] = useState(true);

  // History & Ledger
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dairyRates, setDairyRates] = useState([]);

  // Save State
  const [saving, setSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);

  // Ref for focus
  const qtyInputRef = useRef(null);
  const fatInputRef = useRef(null);
  const clrInputRef = useRef(null);
  const snfInputRef = useRef(null);
  const farmerCodeQueryRef = useRef(null);

  // Fetch farmers on mount
  useEffect(() => {
    const fetchFarmers = async () => {
      setLoadingFarmers(true);
      try {
        const { data } = await api.get(`${apiPrefix}/farmers`, { params: { active: 'true', limit: 1000 } });
        setFarmers(data.customers || []);
      } catch (err) {
        toast.error('Failed to load farmers list.');
      } finally {
        setLoadingFarmers(false);
      }
    };
    const fetchStaff = async () => {
      try {
        const { data } = await api.get(`${apiPrefix}/staff`);
        setStaffList(data.staff || []);
      } catch (err) { /* ignore */ }
    };
    fetchFarmers();
    fetchStaff();
  }, [toast, apiPrefix]);

  // Fetch dairy default rate rules when component mounts or changes
  const fetchDairyRates = useCallback(async () => {
    try {
      const { data } = await api.get(`${apiPrefix}/dairy-default-rates`);
      if (data.configs) {
        setDairyRates(data.configs);
      }
    } catch (err) {
      console.error('Failed to load dairy rates:', err.message);
    }
  }, [apiPrefix]);

  useEffect(() => {
    fetchDairyRates();
  }, [fetchDairyRates]);

  // Fetch next collection number
  const fetchNextCollectionNumber = useCallback(async () => {
    try {
      const { data } = await api.get(`${apiPrefix}/farmer-collections/next-number?date=${date}`);
      setCollectionNumber(data.nextNumber);
    } catch {
      setCollectionNumber('COL-10001');
    }
  }, [date, apiPrefix]);

  useEffect(() => {
    fetchNextCollectionNumber();
  }, [fetchNextCollectionNumber]);

  // Fetch selected farmer history
  const fetchFarmerHistory = useCallback(async (farmerId) => {
    if (!farmerId) return;
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`${apiPrefix}/farmer-collections?farmerId=${farmerId}`);
      setHistory(data.collections || []);
    } catch (err) {
      console.error('Failed to fetch farmer history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [apiPrefix]);

  useEffect(() => {
    if (selectedFarmer) {
      fetchFarmerHistory(selectedFarmer._id);
    } else {
      setHistory([]);
    }
  }, [selectedFarmer, fetchFarmerHistory]);

  // Save center name to localStorage
  const handleCenterNameChange = (val) => {
    setCenterName(val);
    localStorage.setItem('amrit_center_name', val);
  };

  // Farmer Search logic
  const filteredFarmers = farmers.filter(f => {
    const query = searchQuery.toLowerCase();
    const idMatch = f.customerCode ? f.customerCode.toLowerCase().includes(query) : false;
    const nameMatch = f.name ? f.name.toLowerCase().includes(query) : false;
    const phoneMatch = f.phone ? f.phone.includes(query) : false;
    return idMatch || nameMatch || phoneMatch;
  });

  const selectFarmer = (farmer) => {
    setSelectedFarmer(farmer);
    setSearchQuery('');
    setFarmerCodeQuery('');
    setShowSearchResults(false);
    // Autofocus on quantity input
    setTimeout(() => {
      if (qtyInputRef.current) qtyInputRef.current.focus();
    }, 100);
  };

  const handleFarmerCodeSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = farmerCodeQuery.trim();
      if (!code) return;
      const found = farmers.find(f => {
        const cleanF = f.customerCode ? f.customerCode.replace(/\D/g, '') : '';
        return cleanF === code;
      });
      if (found) {
        selectFarmer(found);
      } else {
        toast.error(isMarathi ? 'या कोडचा शेतकरी आढळला नाही.' : 'No farmer found with this code.');
      }
    }
  };

  const handleInputKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleSave(true);
      }
    }
  };

  const clearFarmer = () => {
    setSelectedFarmer(null);
    setSavedRecord(null);
    setTimeout(() => {
      if (farmerCodeQueryRef.current) farmerCodeQueryRef.current.focus();
    }, 100);
  };

  // Pricing calculations
  useEffect(() => {
    // Find active config for selected milkType
    const activeRateConfig = dairyRates.find(r => r.milkType === milkType);
    
    if (!activeRateConfig) {
      setHasRateConfig(false);
      setBaseRate(0);
      setFatBonus(0);
      setSnfBonus(0);
      setFinalRate(0);
      setGrossAmount(0);
      setBonusAmount(0);
      setDeductionAmount(0);
      setNetAmount(0);
      return;
    }

    setHasRateConfig(true);
    const bRate = activeRateConfig.baseRate;
    const fMult = activeRateConfig.fatMultiplier;
    const sMult = activeRateConfig.snfMultiplier;
    const stdFat = activeRateConfig.standardFat ?? 4.0;
    const stdSnf = activeRateConfig.standardSNF ?? 8.5;

    const fVal = parseFloat(fat) || 0;
    const sVal = parseFloat(snf) || 0;
    const qVal = parseFloat(quantity) || 0;

    // Fat Bonus = (Actual Fat - Standard Fat) * 10 * Fat Bonus per 0.1%
    const calculatedFatValue = (fVal - stdFat) * 10 * fMult;
    // SNF Bonus = (Actual SNF - Standard SNF) * 10 * SNF Bonus per 0.1%
    const calculatedSnfValue = (sVal - stdSnf) * 10 * sMult;

    const calculatedFinalRate = Math.max(0, bRate + calculatedFatValue + calculatedSnfValue);
    setBaseRate(bRate);
    setFatBonus(calculatedFatValue); // fat value addition/reduction
    setSnfBonus(calculatedSnfValue); // snf value addition/reduction
    setFinalRate(calculatedFinalRate);

    // Payment Summary Formulas
    const gross = qVal * calculatedFinalRate;
    const bonus = qVal * (activeRateConfig.bonusPerLiter || 0);
    
    const clrVal = parseFloat(clr) || 0;
    let clrDeduction = 0;
    const stdCLR = activeRateConfig.standardCLR ?? 28;
    const clrDedPerUnit = activeRateConfig.clrDeductionPerUnit ?? 0;
    if (clrVal > 0 && clrVal < stdCLR) {
      clrDeduction = (stdCLR - clrVal) * clrDedPerUnit;
    }
    
    const deduction = qVal * ((activeRateConfig.deductionPerLiter || 0) + clrDeduction);
    const net = gross + bonus - deduction;

    setGrossAmount(gross);
    setBonusAmount(bonus);
    setDeductionAmount(deduction);
    setNetAmount(net);
  }, [date, milkType, quantity, fat, snf, clr, dairyRates]);

  // Auto-calculate SNF using Richmond's formula when FAT or CLR is edited
  useEffect(() => {
    const fVal = parseFloat(fat);
    const cVal = parseFloat(clr);
    if (!isNaN(fVal) && !isNaN(cVal) && cVal > 0) {
      const calculatedSnf = (cVal / 4) + (0.2 * fVal) + 0.36;
      setSnf(String(parseFloat(calculatedSnf.toFixed(2))));
    }
  }, [fat, clr]);

  // Save transaction handler
  const handleSave = async (isNew = false) => {
    if (!selectedFarmer) {
      toast.error(isMarathi ? 'कृपया शेतकरी निवडा.' : 'Please select a farmer.');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error(isMarathi ? 'कृपया वैध दूध गुणवत्ता/मात्रा टाका.' : 'Please enter a valid milk quantity.');
      return;
    }
    if (!fat || parseFloat(fat) < 0 || parseFloat(fat) > 15) {
      toast.error(isMarathi ? 'कृपया वैध फॅट % टाका (० ते १५).' : 'Please enter a valid FAT % (0 to 15).');
      return;
    }
    if (!snf || parseFloat(snf) < 0 || parseFloat(snf) > 15) {
      toast.error(isMarathi ? 'कृपया वैध एसएनएफ % टाका (० ते १५).' : 'Please enter a valid SNF % (0 to 15).');
      return;
    }

    const activeRateConfig = dairyRates.find(r => r.milkType === milkType);
    if (!activeRateConfig) {
      toast.error(isMarathi ? 'कृपया प्रथम दर सेटिंग्स पानावर या दूध प्रकारासाठी दर मोजणीचे सूत्र सेट करा.' : 'Please configure pricing formulas for this milk type on the Default Rate page first.');
      return;
    }

    // Re-run calculations locally to guarantee fresh values in payload
    const stdFat = activeRateConfig.standardFat ?? 4.0;
    const stdSnf = activeRateConfig.standardSNF ?? 8.5;
    const fVal = parseFloat(fat) || 0;
    const sVal = parseFloat(snf) || 0;
    const calculatedFatValue = (fVal - stdFat) * 10 * activeRateConfig.fatMultiplier;
    const calculatedSnfValue = (sVal - stdSnf) * 10 * activeRateConfig.snfMultiplier;

    setSaving(true);
    try {
      const payload = {
        farmerId: selectedFarmer._id,
        date,
        time,
        shift,
        milkType,
        quantity: parseFloat(quantity),
        fat: parseFloat(fat),
        snf: parseFloat(snf),
        clr: clr ? parseFloat(clr) : undefined,
        ratePerLiter: finalRate,
        baseRate: activeRateConfig.baseRate,
        fatValue: calculatedFatValue,
        snfValue: calculatedSnfValue,
        grossAmount,
        bonusAmount,
        deductionAmount,
        netAmount,
        notes: notes.trim()
      };

      const { data } = await api.post(`${apiPrefix}/farmer-collections`, payload);
      toast.success(isMarathi ? 'दूध संकलन यशस्वीरित्या जतन केले!' : 'Milk collection saved successfully!');
      
      // Update running farmer balance locally
      setSelectedFarmer(prev => ({
        ...prev,
        balance: prev.balance + netAmount
      }));

      setSavedRecord(data.collection);
      fetchFarmerHistory(selectedFarmer._id);
      fetchNextCollectionNumber();

      if (isNew) {
        // Clear forms except center and operator
        setQuantity('');
        setFat('');
        setSnf('');
        setClr('');
        setNotes('');
        setSelectedFarmer(null);
        setSavedRecord(null);
        setTimeout(() => {
          if (farmerCodeQueryRef.current) farmerCodeQueryRef.current.focus();
        }, 150);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save collection.');
    } finally {
      setSaving(false);
    }
  };

  // Print Receipt handler
  const handlePrint = () => {
    if (!savedRecord && !selectedFarmer) return;
    const printContent = `
      ===================================
             AMRIT DAIRY COLLECTION      
      ===================================
      Receipt No   : ${savedRecord ? savedRecord.collectionNumber : collectionNumber}
      Date         : ${date} (${shift === 'Morning' ? 'MORNING' : 'EVENING'})
      Center       : ${centerName || 'Main Center'}
      Operator     : ${user?.name || 'Operator'}
      -----------------------------------
      Farmer ID    : ${selectedFarmer.customerCode || 'N/A'}
      Farmer Name  : ${selectedFarmer.name}
      Mobile       : ${selectedFarmer.phone}
      -----------------------------------
      Milk Type    : ${milkType}
      Quantity     : ${quantity} Liters
      FAT %        : ${fat}%
      SNF %        : ${snf}%
      CLR          : ${clr || 'N/A'}
      -----------------------------------
      Base Rate    : Rs. ${baseRate.toFixed(2)}/L
      Bonus        : Rs. ${bonusAmount.toFixed(2)}
      Deductions   : Rs. ${deductionAmount.toFixed(2)}
      Final Rate   : Rs. ${finalRate.toFixed(2)}/L
      -----------------------------------
      NET AMOUNT   : Rs. ${netAmount.toFixed(2)}
      ===================================
      Thank you for your delivery!
    `;
    const win = window.open('', '_blank');
    win.document.write(`<pre style="font-family: monospace; font-size: 14px; padding: 20px;">${printContent}</pre>`);
    win.document.close();
    win.print();
  };

  // WhatsApp receipt sender
  const handleSendWhatsApp = () => {
    if (!savedRecord || !selectedFarmer) {
      toast.error(isMarathi ? 'कृपया संदेश पाठवण्यापूर्वी आधी संकलन जतन करा.' : 'Please save the collection before sending WhatsApp.');
      return;
    }
    const phone = selectedFarmer.phone;
    if (!phone) {
      toast.error(isMarathi ? 'शेतकऱ्याचा फोन नंबर उपलब्ध नाही.' : 'Farmer phone not available.');
      return;
    }
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10)          clean = '91' + clean;
    else if (clean.startsWith('0'))   clean = '91' + clean.slice(1);

    const isMr = selectedFarmer.language === 'mr' || isMarathi;
    const dateStr = savedRecord.date || new Date().toLocaleDateString('en-IN');
    const shiftStr = savedRecord.shift === 'Morning' ? (isMr ? 'सकाळ' : 'Morning') : (isMr ? 'संध्याकाळ' : 'Evening');
    const typeStr = savedRecord.milkType === 'Cow' ? (isMr ? 'गाय' : 'Cow') : savedRecord.milkType === 'Buffalo' ? (isMr ? 'म्हैस' : 'Buffalo') : (isMr ? 'मिश्रित' : 'Mixed');

    const msg = isMr 
      ? `🥛 *दूध संकलन पावती* — ${dateStr}\n-------------------------------\nशेतकरी: *${selectedFarmer.name}*\nवेळ: *${shiftStr}*\nदूध प्रकार: *${typeStr}*\nप्रमाण: *${savedRecord.quantity} ली.*\nFAT: *${savedRecord.fat}%* | SNF: *${savedRecord.snf}%*\nदर: *₹${savedRecord.ratePerLiter}/ली.*\nएकूण देय: *₹${savedRecord.netAmount.toFixed(2)}*\n-------------------------------\nडेअरी मॅनेजमेंटद्वारे पाठवले.`
      : `🥛 *Milk Collection Receipt* — ${dateStr}\n-------------------------------\nFarmer: *${selectedFarmer.name}*\nShift: *${shiftStr}*\nMilk Type: *${typeStr}*\nQty: *${savedRecord.quantity} L*\nFAT: *${savedRecord.fat}%* | SNF: *${savedRecord.snf}%*\nRate: *₹${savedRecord.ratePerLiter}/L*\nNet Payable: *₹${savedRecord.netAmount.toFixed(2)}*\n-------------------------------\nSent via Dairy Management.`;

    const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    toast.success(isMarathi ? 'WhatsApp उघडले!' : 'WhatsApp opened!');
  };

  const formattedAmount = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const activeRateConfig = dairyRates.find(r => r.milkType === milkType);
  const stdFat = activeRateConfig?.standardFat ?? 4.0;
  const stdSnf = activeRateConfig?.standardSNF ?? 8.5;
  const stdClr = activeRateConfig?.standardCLR ?? 28;
  const baseRateVal = activeRateConfig?.baseRate ?? 0;

  return (
    <div style={{ maxWidth: '100%', paddingBottom: isMobile ? '80px' : '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isMarathi ? 'दूध संकलन नोंदणी' : 'Milk Collection Entry'}</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            {isMarathi ? 'शेतकऱ्यांकडून दूध संकलनाची जलद नोंदणी आणि हिशोब' : 'Fast recording and calculations for farmer milk collection'}
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '20px' }}>
        
        {/* Left Column - Form & Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Page Header Card */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#0F62FE" /> {isMarathi ? '१. संकलन केंद्र माहिती' : '1. Collection Information'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{isMarathi ? 'संकलन दिनांक' : 'Collection Date'}</label>
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{isMarathi ? 'वेळ' : 'Time'}</label>
                <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{isMarathi ? 'सत्र (शिफ्ट)' : 'Shift'}</label>
                <select className="input" value={shift} onChange={e => setShift(e.target.value)}>
                  <option value="Morning">{isMarathi ? 'Morning (सकाळ)' : 'Morning'}</option>
                  <option value="Evening">{isMarathi ? 'Evening (संध्याकाळ)' : 'Evening'}</option>
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{isMarathi ? 'संकलन केंद्र' : 'Collection Center'}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={isMarathi ? 'उदा. केंद्र १' : 'e.g. Center 1'}
                  value={centerName}
                  onChange={e => handleCenterNameChange(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', borderTop: '1px dashed #E0E0E0', paddingTop: '12px', fontSize: '13px', color: '#525252' }}>
              <div>
                <strong>{isMarathi ? 'संकलन ऑपरेटर: ' : 'Operator: '}</strong>
                {user?.name || 'Operator'}
              </div>
              <div>
                <strong>{isMarathi ? 'संकलन क्रमांक: ' : 'Collection Number: '}</strong>
                <span style={{ color: '#0F62FE', fontWeight: 700 }}>{collectionNumber || 'COL-10001'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Farmer Information Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Users size={16} color="#0F62FE" /> {isMarathi ? '२. शेतकरी निवड' : '2. Farmer Information'}
              </h3>
              {!selectedFarmer && user?.role !== 'staff' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddFarmerModal(true)}
                  style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  <Plus size={14} /> {isMarathi ? 'शेतकरी जोडा' : 'Add Farmer'}
                </button>
              )}
            </div>
            
            {!selectedFarmer ? (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" style={{ fontWeight: 700, color: '#0F62FE' }}>{isMarathi ? 'शेतकरी कोड' : 'Farmer Code'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 101"
                      ref={farmerCodeQueryRef}
                      value={farmerCodeQuery}
                      onChange={e => setFarmerCodeQuery(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={handleFarmerCodeSubmit}
                      style={{ fontWeight: 700, fontSize: '1.2rem', borderColor: '#0F62FE' }}
                      autoFocus
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0, position: 'relative' }}>
                    <label className="input-label">{isMarathi ? 'नाव / मोबाईलने शोधा' : 'Search by Name / Phone'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="input"
                        style={{ paddingLeft: '36px' }}
                        placeholder={isMarathi ? 'शोधा...' : 'Search...'}
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                        onFocus={() => setShowSearchResults(true)}
                      />
                      <Search size={16} color="#8D8D8D" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                    </div>

                    {showSearchResults && searchQuery && (
                      <div style={{
                        position: 'absolute', top: '68px', left: 0, right: 0,
                        backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0',
                        maxHeight: '220px', overflowY: 'auto', zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        {loadingFarmers ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#8D8D8D' }}>Loading farmers...</div>
                        ) : filteredFarmers.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#8D8D8D' }}>No farmers found.</div>
                        ) : (
                          filteredFarmers.map(f => (
                            <div
                              key={f._id}
                              style={{ padding: '10px 12px', borderBottom: '1px solid #F4F4F4', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              onClick={() => selectFarmer(f)}
                              className="search-item-hover"
                            >
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{f.name}</div>
                                <div style={{ fontSize: '11px', color: '#8D8D8D' }}>{f.phone} {f.address ? `| ${f.address}` : ''}</div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0F62FE', backgroundColor: '#EDF5FF', padding: '2px 6px' }}>
                                {f.customerCode || 'N/A'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EDF5FF', border: '1.5px solid #0F62FE', padding: '12px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '16px', width: '85%' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#0043CE' }}>{isMarathi ? 'शेतकरी आयडी' : 'Farmer ID'}</div>
                    <div style={{ fontWeight: 700 }}>{selectedFarmer.customerCode || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#0043CE' }}>{isMarathi ? 'शेतकरी नाव' : 'Farmer Name'}</div>
                    <div style={{ fontWeight: 700 }}>{selectedFarmer.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#0043CE' }}>{isMarathi ? 'मोबाईल नंबर' : 'Mobile Number'}</div>
                    <div style={{ fontWeight: 700 }}>{selectedFarmer.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#0043CE' }}>{isMarathi ? 'गाव / पत्ता' : 'Village / Address'}</div>
                    <div style={{ fontWeight: 700 }}>{selectedFarmer.address || 'N/A'}</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={clearFarmer} style={{ color: '#DA1E28' }}>
                  {isMarathi ? 'बदला' : 'Change'}
                </button>
              </div>
            )}
          </div>

          {/* Card 3: Milk Entry Card */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Droplets size={16} color="#0F62FE" /> {isMarathi ? '३. दूध संकलन नोंदी' : '3. Milk Collection Entry'}
            </h3>
            
            {activeRateConfig && (
              <div style={{
                backgroundColor: '#EDF5FF',
                borderLeft: '4px solid #0F62FE',
                padding: '10px 14px',
                fontSize: '12.5px',
                color: '#161616',
                marginBottom: '16px',
                borderRadius: '0 4px 4px 0',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: '#0F62FE' }}>
                  {isMarathi ? `${milkType === 'Cow' ? 'गाय' : milkType === 'Buffalo' ? 'म्हैस' : 'मिश्रित'} दर पत्रक:` : `${milkType} Rate Config:`}
                </span>
                <span>{isMarathi ? 'मूळ दर:' : 'Base Rate:'} <strong>₹{baseRateVal.toFixed(2)}/L</strong></span>
                <span>{isMarathi ? 'प्रमाणित फॅट:' : 'Std FAT:'} <strong>{stdFat}%</strong> (± ₹{(activeRateConfig.fatMultiplier * 10).toFixed(2)} per 1%)</span>
                <span>{isMarathi ? 'प्रमाणित एसएनएफ:' : 'Std SNF:'} <strong>{stdSnf}%</strong> (± ₹{(activeRateConfig.snfMultiplier * 10).toFixed(2)} per 1%)</span>
                <span>{isMarathi ? 'प्रमाणित सीएलआर:' : 'Std CLR:'} <strong>{stdClr}</strong></span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'दूध प्रकार' : 'Milk Type'}</label>
                <select className="input" value={milkType} onChange={e => setMilkType(e.target.value)} onKeyDown={e => handleInputKeyDown(e, qtyInputRef)}>
                  <option value="Cow">{isMarathi ? 'Cow (गाय)' : 'Cow'}</option>
                  <option value="Buffalo">{isMarathi ? 'Buffalo (म्हैस)' : 'Buffalo'}</option>
                  <option value="Mixed">{isMarathi ? 'Mixed (मिश्रित)' : 'Mixed'}</option>
                </select>
                {activeRateConfig && (
                  <span style={{ fontSize: '11px', color: '#24A148', marginTop: '2px', display: 'block', fontWeight: 600 }}>
                    {isMarathi ? `आधारभूत दर: ₹${baseRateVal.toFixed(2)}/ली.` : `Base Rate: ₹${baseRateVal.toFixed(2)}/L`}
                  </span>
                )}
              </div>
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'मात्रा (लिटर) *' : 'Quantity (Liters) *'}</label>
                <input
                  type="number" step="0.01" className="input" ref={qtyInputRef}
                  placeholder="0.00" value={quantity} onChange={e => setQuantity(e.target.value)}
                  onKeyDown={e => handleInputKeyDown(e, fatInputRef)}
                  style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', height: '60px', color: '#0F62FE' }}
                />
              </div>
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'फॅट % (FAT) * (० - १५%)' : 'FAT % * (0 - 15%)'}</label>
                <input
                  type="number" step="0.01" className="input" ref={fatInputRef}
                  placeholder="0.00" value={fat} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d{0,2}(\.\d{0,2})?$/.test(val)) {
                      if (val === '' || parseFloat(val) <= 15) {
                        setFat(val);
                      }
                    }
                  }}
                  onKeyDown={e => handleInputKeyDown(e, clrInputRef)}
                  style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', height: '60px', color: '#0F62FE' }}
                />
                <span style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '2px', display: 'block' }}>
                  {isMarathi ? `प्रमाणित फॅट: ${stdFat}%` : `Std FAT: ${stdFat}%`}
                </span>
              </div>
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'सीएलआर (CLR)' : 'CLR (Optional)'}</label>
                <input
                  type="number" className="input" ref={clrInputRef}
                  placeholder="0" value={clr} onChange={e => setClr(e.target.value)}
                  onKeyDown={e => handleInputKeyDown(e, snfInputRef)}
                  style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', height: '60px', color: '#0F62FE' }}
                />
                <span style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '2px', display: 'block' }}>
                  {isMarathi ? `प्रमाणित: ${stdClr}` : `Std CLR: ${stdClr}`}
                </span>
                {(() => {
                  if (clr && parseFloat(clr) < stdClr) {
                    return (
                      <span style={{ fontSize: '11px', color: '#DA1E28', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                        ⚠️ {isMarathi ? `कमी सीएलआर!` : `Low CLR!`}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'एसएनएफ % (SNF) * (० - १५%)' : 'SNF % * (0 - 15%)'}</label>
                <input
                  type="number" step="0.01" className="input" ref={snfInputRef}
                  placeholder="0.00" value={snf} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d{0,2}(\.\d{0,2})?$/.test(val)) {
                      if (val === '' || parseFloat(val) <= 15) {
                        setSnf(val);
                      }
                    }
                  }}
                  onKeyDown={e => handleInputKeyDown(e, null)}
                  style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', height: '60px', color: '#0F62FE' }}
                />
                <span style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '2px', display: 'block' }}>
                  {isMarathi ? `प्रमाणित एसएनएफ: ${stdSnf}%` : `Std SNF: ${stdSnf}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Card 8: Notes Section */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>{isMarathi ? '४. नोंदी / शेरा' : '4. Notes & Remarks'}</h3>
            <textarea
              className="input"
              rows={3}
              placeholder={isMarathi ? 'उदा. दूध दर्जा समस्या, हाताने सुधारित दर इत्यादी...' : 'e.g. Manual correction, milk quality issues...'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {/* Card 6: Collection History Card (10 entries table) */}
          {selectedFarmer && (
            <div className="card" style={{ marginTop: '12px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>
                {isMarathi ? `शेतकरी पावती इतिहास (${selectedFarmer.name})` : `Collection History (${selectedFarmer.name})`}
              </h3>

              {loadingHistory ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: 'auto' }} />
                </div>
              ) : history.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#8D8D8D' }}>
                  {isMarathi ? 'या शेतकऱ्यासाठी अद्याप कोणतीही संकलन नोंदणी नाही.' : 'No recent milk collection entries for this farmer.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{isMarathi ? 'संकलन क्रमांक' : 'Receipt No'}</th>
                          <th>{isMarathi ? 'दिनांक' : 'Date'}</th>
                          <th>{isMarathi ? 'सत्र' : 'Shift'}</th>
                          <th>{isMarathi ? 'प्रकार' : 'Milk Type'}</th>
                          <th>{isMarathi ? 'मात्रा (L)' : 'Quantity (L)'}</th>
                          <th>{isMarathi ? 'FAT %' : 'FAT %'}</th>
                          <th>{isMarathi ? 'SNF %' : 'SNF %'}</th>
                          <th>{isMarathi ? 'दर/L' : 'Rate/L'}</th>
                          <th>{isMarathi ? 'निव्वळ रक्कम' : 'Net Amount'}</th>
                          <th>{isMarathi ? 'कृती' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(h => {
                          const isSameDay = h.date === getLocalDateStr();
                          const isOwnRecord = !h.staffId || h.staffId === user?._id || (h.staffId?._id || h.staffId) === user?._id;
                          const canEdit = user?.role === 'owner' || (user?.role === 'staff' && isSameDay && isOwnRecord);

                          return (
                            <tr key={h._id}>
                              <td style={{ fontWeight: 700, color: '#0F62FE' }}>
                                <div>{h.collectionNumber}</div>
                                {h.isEdited && (
                                  <div style={{ fontSize: '10px', color: '#8A3FFC', fontWeight: 500, backgroundColor: '#F3E8FF', padding: '1px 4px', borderRadius: '2px', display: 'inline-block', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                    ✍️ {isMarathi ? `${h.editedBy} द्वारे संपादित` : `Edited by ${h.editedBy}`}
                                  </div>
                                )}
                              </td>
                              <td>{h.date}</td>
                              <td>
                                <span className={`badge ${h.shift === 'Morning' ? 'badge-blue' : 'badge-orange'}`} style={{ fontSize: '10px' }}>
                                  {h.shift === 'Morning' ? (isMarathi ? 'सकाळ' : 'Morning') : (isMarathi ? 'संध्याकाळ' : 'Evening')}
                                </span>
                              </td>
                              <td>{h.milkType === 'Cow' ? (isMarathi ? 'गाय' : 'Cow') : h.milkType === 'Buffalo' ? (isMarathi ? 'म्हैस' : 'Buffalo') : (isMarathi ? 'मिश्रित' : 'Mixed')}</td>
                              <td>{h.quantity.toFixed(2)} L</td>
                              <td>{h.fat.toFixed(2)}%</td>
                              <td>{h.snf.toFixed(2)}%</td>
                              <td>₹{h.ratePerLiter.toFixed(2)}</td>
                              <td style={{ fontWeight: 700 }}>{formattedAmount(h.netAmount)}</td>
                              <td>
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '2px 8px', fontSize: '12px', height: 'auto', border: '1px solid #E0E0E0', color: '#0F62FE', cursor: 'pointer' }}
                                    onClick={() => setEditingCollection(h)}
                                  >
                                    {isMarathi ? 'संपादित करा' : 'Edit'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column - Calculations, Summaries, History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: isMobile ? 'static' : 'sticky', top: '24px', alignSelf: 'flex-start' }}>
          
          {/* Card 4: Automatic Rate Calculation */}
          <div className="card" style={{ borderLeft: '4px solid #8A3FFC' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', color: '#8A3FFC' }}>
              {isMarathi ? 'दर गणित (प्रति लिटर)' : 'Automatic Rate Calculation'}
            </h3>
            {hasRateConfig ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E0E0E0', paddingBottom: '6px' }}>
                  <span>{isMarathi ? 'मूळ दर' : 'Base Rate'}</span>
                  <strong style={{ color: '#161616' }}>₹{baseRate.toFixed(2)}/L</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E0E0E0', paddingBottom: '6px' }}>
                  <span>{isMarathi ? 'फॅट मूल्य वाढ' : 'FAT Value Addition'}</span>
                  <span style={{ color: '#24A148', fontWeight: 700 }}>
                    +₹{fatBonus.toFixed(2)}/L
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E0E0E0', paddingBottom: '6px' }}>
                  <span>{isMarathi ? 'एसएनएफ मूल्य वाढ' : 'SNF Value Addition'}</span>
                  <span style={{ color: '#24A148', fontWeight: 700 }}>
                    +₹{snfBonus.toFixed(2)}/L
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontSize: '16px' }}>
                  <strong>{isMarathi ? 'अंतिम दर (प्रति लिटर)' : 'Final Rate Per Litre'}</strong>
                  <strong style={{ color: '#8A3FFC', fontSize: '18px' }}>₹{finalRate.toFixed(2)}/L</strong>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E0E0E0', paddingBottom: '6px' }}>
                  <span>{isMarathi ? 'मूळ दर' : 'Base Rate'}</span>
                  <strong style={{ color: '#DA1E28' }}>{isMarathi ? 'डिफॉल्ट दर सेट नाही' : 'no default price set'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontSize: '16px' }}>
                  <strong>{isMarathi ? 'अंतिम दर (प्रति लिटर)' : 'Final Rate Per Litre'}</strong>
                  <strong style={{ color: '#DA1E28', fontSize: '15px' }}>{isMarathi ? 'डिफॉल्ट दर सेट नाही' : 'no default price set'}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Payment Summary */}
          <div className="card" style={{ borderLeft: '4px solid #0F62FE', backgroundColor: '#F4F7FF' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', color: '#0F62FE' }}>
              {isMarathi ? 'पेमेंट सारांश' : 'Payment Summary'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{isMarathi ? 'मात्रा' : 'Quantity'}</span>
                <span>{quantity ? parseFloat(quantity).toFixed(2) : '0.00'} L</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{isMarathi ? 'मूळ रक्कम (Gross)' : 'Gross Amount'}</span>
                <span>{formattedAmount(grossAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#24A148' }}>
                <span>{isMarathi ? 'एकूण बोनस' : 'Bonus Amount'}</span>
                <span>+{formattedAmount(bonusAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DA1E28' }}>
                <span>{isMarathi ? 'एकूण वजावट' : 'Deduction Amount'}</span>
                <span>-{formattedAmount(deductionAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #0F62FE', paddingTop: '10px', fontSize: '18px' }}>
                <strong style={{ color: '#0F62FE' }}>{isMarathi ? 'निव्वळ देय रक्कम' : 'Net Payable Amount'}</strong>
                <strong style={{ color: '#0F62FE' }}>{formattedAmount(netAmount)}</strong>
              </div>
            </div>
          </div>

          {/* Card 7: Farmer Ledger Summary */}
          {selectedFarmer && (
            <div className="card" style={{ borderLeft: '4px solid #FF832B' }}>
              <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', color: '#FF832B' }}>
                {isMarathi ? 'शेतकरी खाते सारांश' : 'Farmer Ledger Summary'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E0E0E0', paddingBottom: '6px' }}>
                  <span>{isMarathi ? 'मागील शिल्लक' : 'Previous Balance'}</span>
                  <strong style={{ color: selectedFarmer.balance >= 0 ? '#24A148' : '#DA1E28' }}>
                    {formattedAmount(selectedFarmer.balance)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E0E0E0', paddingBottom: '6px' }}>
                  <span>{isMarathi ? 'चालू संकलन रक्कम' : 'Current Collection'}</span>
                  <strong>{formattedAmount(netAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontSize: '15px' }}>
                  <strong>{isMarathi ? 'एकूण देय रक्कम' : 'Total Outstanding'}</strong>
                  <strong style={{ color: '#161616' }}>{formattedAmount(selectedFarmer.balance + netAmount)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Card 9: Actions Section */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary" style={{ flex: 1, height: '48px', fontSize: '15px' }}
                onClick={() => handleSave(false)} disabled={saving || !selectedFarmer}
              >
                {saving ? (
                  <div className="spinner" style={{ width: '18px', height: '18px' }} />
                ) : (
                  <><Save size={16} /> {isMarathi ? 'संकलन जतन करा' : 'Save Collection'}</>
                )}
              </button>
              
              <button
                className="btn btn-ghost" style={{ flex: 1, height: '48px', border: '1px solid #0F62FE', color: '#0F62FE', fontSize: '15px' }}
                onClick={() => handleSave(true)} disabled={saving || !selectedFarmer}
              >
                <Plus size={16} /> {isMarathi ? 'जतन करा व नवीन' : 'Save & New'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-ghost" style={{ flex: 1, border: '1px solid #525252', color: '#525252' }}
                onClick={handlePrint} disabled={!selectedFarmer}
              >
                <Printer size={16} /> {isMarathi ? 'पावती प्रिंट करा' : 'Print Receipt'}
              </button>
              
              <button
                className="btn btn-ghost" style={{ flex: 1, border: '1px solid #24A148', color: '#24A148', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={handleSendWhatsApp} disabled={!savedRecord}
              >
                <MessageSquare size={16} /> {isMarathi ? 'व्हॉट्सॲप पावती' : 'WhatsApp Receipt'}
              </button>
            </div>
          </div>

        </div>

      </div>

      {showAddFarmerModal && user?.role !== 'staff' && (
        <FarmerModal
          farmer={null}
          onClose={() => setShowAddFarmerModal(false)}
          onSaved={async () => {
            // Re-fetch farmers
            try {
              const { data } = await api.get(`${apiPrefix}/farmers`, { params: { active: 'true', limit: 1000 } });
              setFarmers(data.customers || []);
              toast.success(isMarathi ? 'नवीन शेतकरी यशस्वीरित्या जोडला गेला!' : 'New farmer added successfully!');
            } catch (err) { /* ignore */ }
          }}
        />
      )}

      {/* Mobile Sticky Bottom Bar */}
      {isMobile && selectedFarmer && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 999,
          borderTop: '1px solid #E0E0E0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', color: '#6F6F6F', fontWeight: 500 }}>
              {milkType === 'Cow' ? (isMarathi ? 'गाय' : 'Cow') : milkType === 'Buffalo' ? (isMarathi ? 'म्हैस' : 'Buffalo') : (isMarathi ? 'मिश्रित' : 'Mixed')} {quantity ? `${parseFloat(quantity).toFixed(2)}L` : ''}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F62FE' }}>
              {formattedAmount(netAmount)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-ghost"
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{ height: '40px', padding: '0 12px', border: '1px solid #0F62FE', color: '#0F62FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={16} />
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <><Save size={14} /> {isMarathi ? 'जतन' : 'Save'}</>}
            </button>
          </div>
        </div>
      )}

      {editingCollection && (
        <EditCollectionModal
          collection={editingCollection}
          dairyRates={dairyRates}
          apiPrefix={apiPrefix}
          onClose={() => setEditingCollection(null)}
          onSaved={(updated) => {
            setHistory(prev => prev.map(h => h._id === updated._id ? updated : h));
            setEditingCollection(null);
            if (selectedFarmer) {
              fetchFarmerHistory(selectedFarmer._id);
            }
          }}
        />
      )}
    </div>
  );
};

// ── Edit Farmer Collection Modal Component ──────────────────────
const EditCollectionModal = ({ collection, dairyRates, apiPrefix, onClose, onSaved }) => {
  const { isMarathi } = useMarathi();
  const toast = useToast();
  const L = isMarathi ? 'ली.' : 'L';
  const mouseDownOnOverlay = useRef(false);

  const [quantity, setQuantity] = useState(String(collection.quantity));
  const [fat, setFat] = useState(String(collection.fat));
  const [snf, setSnf] = useState(String(collection.snf));
  const [clr, setClr] = useState(String(collection.clr || ''));
  const [notes, setNotes] = useState(collection.notes || '');
  const [loading, setLoading] = useState(false);

  // pricing state variables
  const [baseRate, setBaseRate] = useState(0);
  const [finalRate, setFinalRate] = useState(0);
  const [grossAmount, setGrossAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [deductionAmount, setDeductionAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  // pricing calculations (same formula as create)
  useEffect(() => {
    const activeRateConfig = dairyRates.find(r => r.milkType === collection.milkType);
    if (!activeRateConfig) return;

    const bRate = activeRateConfig.baseRate;
    const fMult = activeRateConfig.fatMultiplier;
    const sMult = activeRateConfig.snfMultiplier;
    const stdFat = activeRateConfig.standardFat ?? 4.0;
    const stdSnf = activeRateConfig.standardSNF ?? 8.5;

    const fVal = parseFloat(fat) || 0;
    const sVal = parseFloat(snf) || 0;
    const qVal = parseFloat(quantity) || 0;

    const calculatedFatValue = (fVal - stdFat) * 10 * fMult;
    const calculatedSnfValue = (sVal - stdSnf) * 10 * sMult;
    const calculatedFinalRate = Math.max(0, bRate + calculatedFatValue + calculatedSnfValue);

    const gross = qVal * calculatedFinalRate;
    const bonus = qVal * (activeRateConfig.bonusPerLiter || 0);

    const clrVal = parseFloat(clr) || 0;
    let clrDeduction = 0;
    const stdCLR = activeRateConfig.standardCLR ?? 28;
    const clrDedPerUnit = activeRateConfig.clrDeductionPerUnit ?? 0;
    if (clrVal > 0 && clrVal < stdCLR) {
      clrDeduction = (stdCLR - clrVal) * clrDedPerUnit;
    }

    const deduction = qVal * ((activeRateConfig.deductionPerLiter || 0) + clrDeduction);
    const net = gross + bonus - deduction;

    setBaseRate(bRate);
    setFinalRate(calculatedFinalRate);
    setGrossAmount(gross);
    setBonusAmount(bonus);
    setDeductionAmount(deduction);
    setNetAmount(net);
  }, [quantity, fat, snf, clr, dairyRates, collection.milkType]);

  // Richmond SNF calculation
  useEffect(() => {
    const fVal = parseFloat(fat);
    const cVal = parseFloat(clr);
    if (!isNaN(fVal) && !isNaN(cVal) && cVal > 0) {
      const calculatedSnf = (cVal / 4) + (0.2 * fVal) + 0.36;
      setSnf(String(parseFloat(calculatedSnf.toFixed(2))));
    }
  }, [fat, clr]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qVal = parseFloat(quantity);
    const fVal = parseFloat(fat);
    const sVal = parseFloat(snf);
    const cVal = parseFloat(clr) || 0;

    if (isNaN(qVal) || qVal <= 0) {
      toast.error(isMarathi ? 'कृपया वैध मात्रा प्रविष्ट करा.' : 'Please enter a valid quantity.');
      return;
    }
    if (isNaN(fVal) || fVal < 0) {
      toast.error(isMarathi ? 'कृपया वैध FAT प्रविष्ट करा.' : 'Please enter a valid FAT value.');
      return;
    }
    if (isNaN(sVal) || sVal < 0) {
      toast.error(isMarathi ? 'कृपया वैध SNF प्रविष्ट करा.' : 'Please enter a valid SNF value.');
      return;
    }

    const activeRateConfig = dairyRates.find(r => r.milkType === collection.milkType);
    const fMult = activeRateConfig?.fatMultiplier || 0;
    const sMult = activeRateConfig?.snfMultiplier || 0;
    const fatVal = (fVal - (activeRateConfig?.standardFat ?? 4.0)) * 10 * fMult;
    const snfVal = (sVal - (activeRateConfig?.standardSNF ?? 8.5)) * 10 * sMult;

    setLoading(true);
    try {
      const { data } = await api.patch(`${apiPrefix}/farmer-collections/${collection._id}`, {
        quantity: qVal,
        fat: fVal,
        snf: sVal,
        clr: cVal,
        ratePerLiter: finalRate,
        baseRate,
        fatValue: fatVal,
        snfValue: snfVal,
        grossAmount,
        bonusAmount,
        deductionAmount,
        netAmount,
        notes
      });
      toast.success(isMarathi ? 'नोंद अपडेट केली.' : 'Milk collection entry updated.');
      onSaved(data.collection);
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'अपडेट करण्यात अक्षम.' : 'Failed to update collection.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: '420px', position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#8D8D8D',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F4F4F4'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingRight: '24px' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '18px' }}>
                  {isMarathi ? 'संकलन नोंद संपादित करा' : 'Edit Collection Entry'}
                </h2>
                <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
                  {isMarathi ? 'संकलन क्रमांक' : 'Receipt No'}: {collection.collectionNumber} · {collection.date} · {isMarathi ? (collection.shift === 'Morning' ? 'सकाळ' : 'संध्याकाळ') : collection.shift}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F4F4F4', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#525252' }}>{isMarathi ? 'दूध प्रकार' : 'Milk Type'}</span>
                <span style={{ fontWeight: 600 }}>
                  {collection.milkType === 'Cow' ? (isMarathi ? 'गाय' : 'Cow') : collection.milkType === 'Buffalo' ? (isMarathi ? 'म्हैस' : 'Buffalo') : (isMarathi ? 'मिश्रित' : 'Mixed')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#525252' }}>{isMarathi ? 'दर प्रति लिटर' : 'Rate Per Liter'}</span>
                <span style={{ fontWeight: 600 }}>₹{finalRate.toFixed(2)}/{L}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E0E0E0', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#525252' }}>{isMarathi ? 'एकूण रक्कम' : 'Net Amount'}</span>
                <span style={{ fontWeight: 700, color: '#0F62FE' }}>
                  ₹{netAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">{isMarathi ? 'मात्रा (लिटर)' : 'Quantity (Liters)'}</label>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                placeholder="0.00"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label className="input-label">{isMarathi ? 'FAT %' : 'FAT %'}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="0.0"
                  value={fat}
                  onChange={e => setFat(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'CLR (ऐच्छिक)' : 'CLR (Optional)'}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="0.0"
                  value={clr}
                  onChange={e => setClr(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">{isMarathi ? 'SNF %' : 'SNF %'}</label>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                placeholder="0.0"
                value={snf}
                onChange={e => setSnf(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">{isMarathi ? 'नोंदी' : 'Notes'}</label>
              <input
                type="text"
                className="input"
                placeholder={isMarathi ? 'पर्यायी नोंद...' : 'Optional note...'}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>
              {isMarathi ? 'रद्द करा' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (isMarathi ? 'जतन होत आहे...' : 'Saving...') : (isMarathi ? 'बदल जतन करा' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── ORIGINAL MILK SUPPLIER / GENERAL DAILY COLLECTION ──────────────────────────
const DailyCollectionMilkSupplier = () => {
  const toast = useToast();
  const { isMarathi } = useMarathi();
  const L = isMarathi ? 'ली.' : 'L';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  // Safe date helper functions
  const toDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const [date, setDate] = useState(() => toDateStr(new Date()));
  const [collection, setCollection] = useState(null);
  const [staff, setStaff] = useState([]);
  const [deliveredByStaff, setDeliveredByStaff] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const showSkeleton = useDelayedLoading(loading);

  // Form state
  const [totalLiters, setTotalLiters] = useState('');
  const [source, setSource] = useState('');
  const [procurementRate, setProcurementRate] = useState('');
  const [notes, setNotes] = useState('');
  const [quotas, setQuotas] = useState({}); // { staffId: liters }

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/owner/collection?date=${date}`);
      setCollection(data.collection);
      setStaff(data.staff || []);
      setDeliveredByStaff(data.deliveredByStaff || {});

      // Populate form from existing collection
      if (data.collection) {
        setTotalLiters(data.collection.totalLiters?.toString() || '');
        setSource(data.collection.source || '');
        setProcurementRate(data.collection.procurementRate?.toString() || '');
        setNotes(data.collection.notes || '');
        const q = {};
        (data.collection.staffQuotas || []).forEach(sq => {
          q[sq.staffId] = sq.assignedLiters?.toString() || '';
        });
        setQuotas(q);
      } else {
        setTotalLiters('');
        setSource('');
        setProcurementRate('');
        setNotes('');
        setQuotas({});
      }
    } catch {
      toast.error('Failed to load collection data.');
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const throttledRefresh = useThrottle(fetchCollection);

  const totalAssigned = Object.values(quotas).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalL = parseFloat(totalLiters) || 0;
  const unallocated = Math.max(0, totalL - totalAssigned);
  const overAllocated = totalAssigned > totalL && totalL > 0;

  const handleSave = async () => {
    if (!totalLiters || parseFloat(totalLiters) < 0) {
      toast.error(isMarathi ? 'वैध एकूण लिटर मूल्य टाका.' : 'Enter a valid total liters value.');
      return;
    }
    if (overAllocated) {
      toast.error(isMarathi
        ? `कर्मचारी कोटा (${totalAssigned}${L}) एकूण संकलनापेक्षा (${totalL}${L}) जास्त आहे.`
        : `Staff quotas (${totalAssigned}L) exceed total collection (${totalL}L).`);
      return;
    }
    if (procurementRate && (isNaN(parseFloat(procurementRate)) || parseFloat(procurementRate) <= 0)) {
      toast.error(isMarathi ? 'कृपया वैध खरेदी दर टाका.' : 'Please enter a valid procurement rate.');
      return;
    }

    setSaving(true);
    try {
      const staffQuotas = staff
        .filter(s => quotas[s._id] && parseFloat(quotas[s._id]) > 0)
        .map(s => ({ staffId: s._id, assignedLiters: parseFloat(quotas[s._id]) }));

      await api.post('/owner/collection', {
        date,
        totalLiters: parseFloat(totalLiters),
        source: source.trim(),
        procurementRate: procurementRate ? parseFloat(procurementRate) : null,
        staffQuotas,
        notes: notes.trim()
      });

      toast.success(isMarathi ? 'दैनिक संकलन जतन केले.' : 'Daily collection saved.');
      fetchCollection();
    } catch (err) {
      toast.error(err.response?.data?.error || (isMarathi ? 'संकलन जतन करता आले नाही.' : 'Failed to save collection.'));
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (days) => {
    const d = parseLocalDate(date);
    d.setDate(d.getDate() + days);
    setDate(toDateStr(d));
  };

  const isToday = date === toDateStr(new Date());
  const displayDate = parseLocalDate(date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // Metrics
  const totalDeliveredToday = Object.values(deliveredByStaff).reduce((s, v) => s + v, 0);

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isMarathi ? 'दैनिक संकलन' : 'Daily Collection'}</h1>
          <div style={{ fontSize: '13px', color: '#8D8D8D', marginTop: '2px' }}>
            {isMarathi ? 'आजचे दूध संकलन नोंदवा आणि कर्मचारी कोटा नियुक्त करा' : "Log today's milk intake and assign staff delivery quotas"}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button className="date-nav-btn" onClick={() => shiftDate(-1)}>
            <ChevronLeft size={16} />
          </button>
          <div style={{
            padding: '8px 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #0F62FE',
            fontSize: '14px', fontWeight: 600, color: '#0F62FE', minWidth: '220px', textAlign: 'center'
          }}>
            {displayDate} {isToday && <span style={{ fontSize: '11px', color: '#24A148', marginLeft: '6px' }}>{isMarathi ? 'आज' : 'TODAY'}</span>}
          </div>
          <button className="date-nav-btn" onClick={() => shiftDate(1)} disabled={isToday}>
            <ChevronRight size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={throttledRefresh} disabled={loading}>
            <RefreshCw size={13} />
          </button>
        </div>

        {showSkeleton ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {[0,1,2].map(i => (
              <div key={i} className="skeleton-card" style={{ height: '80px' }}>
                <div className="skeleton-row">
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-line-sm" style={{ width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : isMobile ? (
          /* ── Mobile single-column layout (no accordion) ── */
          <div style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Collection entry card */}
            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplets size={16} color="#0F62FE" /> {isMarathi ? 'दूध संकलन नोंद' : 'Milk Collection Entry'}
              </h3>

              <div className="input-group">
                <label className="input-label">{isMarathi ? `एकूण दूध संकलन (${L}) *` : 'Total Milk Collected (Liters) *'}</label>
                <input
                  type="number" className="input" min="0" step="0.5"
                  placeholder={isMarathi ? 'उदा. ६०' : 'e.g. 60'}
                  value={totalLiters}
                  onChange={e => setTotalLiters(e.target.value)}
                  style={{ fontSize: '20px', fontWeight: 700, height: '52px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'स्रोत' : 'Source'}</label>
                  <input type="text" className="input" placeholder={isMarathi ? 'उदा. शर्मा फार्म' : 'e.g. Sharma Farm'}
                    value={source} onChange={e => setSource(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">{isMarathi ? `खरेदी दर (₹/${L})` : `Rate (₹/${L})`}</label>
                  <input type="number" className="input" min="0" step="0.5" placeholder={isMarathi ? 'उदा. ३५' : 'e.g. 35'}
                    value={procurementRate} onChange={e => setProcurementRate(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{isMarathi ? 'नोंदी' : 'Notes'}</label>
                <input type="text" className="input" placeholder={isMarathi ? 'आजच्या संकलनाबद्दल नोंदी' : "Any notes about today's collection"}
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Summary metrics */}
              {totalL > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div className="stat-card" style={{ padding: '10px 12px' }}>
                    <div className="stat-label" style={{ fontSize: '10px' }}>{isMarathi ? 'एकूण' : 'Collected'}</div>
                    <div className="stat-value" style={{ fontSize: '18px', color: '#0F62FE' }}>{totalL}{L}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '10px 12px' }}>
                    <div className="stat-label" style={{ fontSize: '10px' }}>{isMarathi ? 'नियुक्त' : 'Assigned'}</div>
                    <div className="stat-value" style={{ fontSize: '18px', color: overAllocated ? '#DA1E28' : '#161616' }}>{totalAssigned.toFixed(1)}{L}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '10px 12px' }}>
                    <div className="stat-label" style={{ fontSize: '10px' }}>{isMarathi ? 'शिल्लक' : 'Remaining'}</div>
                    <div className="stat-value" style={{ fontSize: '18px', color: unallocated > 0 ? '#FF832B' : '#24A148' }}>{unallocated.toFixed(1)}{L}</div>
                  </div>
                </div>
              )}

              {overAllocated && (
                <div style={{ backgroundColor: '#FFF1F1', border: '1px solid #DA1E28', padding: '10px 12px', marginBottom: '12px', display: 'flex', gap: '8px', fontSize: '12px', color: '#DA1E28' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  {isMarathi
                    ? `कर्मचारी कोटा (${totalAssigned.toFixed(1)}${L}) एकूण संकलनापेक्षा जास्त आहे.`
                    : `Staff quotas (${totalAssigned.toFixed(1)}L) exceed total collection (${totalL}L).`}
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={saving || !totalLiters || overAllocated}
                style={{ height: '48px', fontSize: '15px' }}
              >
                {saving
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {isMarathi ? 'जतन होत आहे...' : 'Saving...'}</>
                  : <><Save size={16} /> {isMarathi ? 'संकलन जतन करा' : 'Save Collection'}</>}
              </button>
            </div>

            {/* Staff quota card */}
            {staff.length > 0 && (
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
                  {isMarathi ? 'कर्मचारी कोटा' : 'Staff Quotas'}
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {staff.map(s => {
                    const assigned = parseFloat(quotas[s._id] || 0);
                    const delivered = deliveredByStaff[s._id] || 0;
                    const pct = assigned > 0 ? Math.min(100, (delivered / assigned) * 100) : 0;
                    const overDelivered = delivered > assigned && assigned > 0;
                    return (
                      <div key={s._id} style={{ backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: assigned > 0 ? '8px' : 0 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', color: '#8D8D8D' }}>{s.phone}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number" min="0" step="0.5"
                              placeholder="0"
                              value={quotas[s._id] || ''}
                              onChange={e => setQuotas(prev => ({ ...prev, [s._id]: e.target.value }))}
                              style={{
                                width: '72px', height: '40px', padding: '0 8px',
                                border: '1px solid #8D8D8D', fontSize: '16px', fontWeight: 700,
                                textAlign: 'center', fontFamily: 'inherit',
                                backgroundColor: '#FFFFFF', outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '13px', color: '#525252' }}>{L}</span>
                          </div>
                        </div>
                        {assigned > 0 && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#525252', marginBottom: '4px' }}>
                              <span>{isMarathi ? 'वितरित' : 'Delivered'}: <strong>{delivered.toFixed(1)}{L}</strong></span>
                              <span style={{ color: overDelivered ? '#DA1E28' : '#525252' }}>
                                {isMarathi ? 'कोटा' : 'Quota'}: {assigned.toFixed(1)}{L}
                              </span>
                            </div>
                            <div style={{ height: '5px', backgroundColor: '#E0E0E0', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                backgroundColor: overDelivered ? '#DA1E28' : pct >= 100 ? '#24A148' : '#0F62FE',
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            {pct >= 100 && (
                              <div style={{ fontSize: '11px', color: '#24A148', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={10} /> {isMarathi ? 'कोटा पूर्ण' : 'Quota fulfilled'}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalDeliveredToday > 0 && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#DEFBE6', border: '1px solid #24A148' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0E6027', marginBottom: '2px' }}>
                      {isMarathi ? 'आज एकूण वितरित' : 'Total Delivered Today'}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#0E6027' }}>
                      {totalDeliveredToday.toFixed(1)}{L}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Desktop two-column layout ── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="collection-grid">

            {/* Left — Collection entry */}
            <div>
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={18} color="#0F62FE" /> {isMarathi ? 'दूध संकलन नोंद' : 'Milk Collection Entry'}
                </h3>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? `आजचे एकूण दूध संकलन (${L}) *` : 'Total Milk Collected Today (Liters) *'}</label>
                  <input
                    type="number" className="input" min="0" step="0.5"
                    placeholder={isMarathi ? 'उदा. ६०' : 'e.g. 60'}
                    value={totalLiters}
                    onChange={e => setTotalLiters(e.target.value)}
                    style={{ fontSize: '20px', fontWeight: 700, height: '52px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#8D8D8D', marginTop: '4px' }}>
                    {isMarathi ? 'आज तुम्ही पुरवठादाराकडून किती दूध घेतले.' : 'This is the total milk you procured/collected today from your supplier.'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">{isMarathi ? 'स्रोत / पुरवठादार' : 'Source / Supplier'}</label>
                    <input type="text" className="input" placeholder={isMarathi ? 'उदा. शर्मा फार्म' : 'e.g. Sharma Farm'}
                      value={source} onChange={e => setSource(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">{isMarathi ? `खरेदी दर (₹/${L})` : 'Procurement Rate (₹/L)'}</label>
                    <input type="text" className="input" placeholder={isMarathi ? 'उदा. ३५' : 'e.g. 35'}
                      value={procurementRate} onChange={e => setProcurementRate(e.target.value.replace(/[^0-9.]/g, ''))} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">{isMarathi ? 'नोंदी' : 'Notes'}</label>
                  <input type="text" className="input" placeholder={isMarathi ? 'आजच्या संकलनाबद्दल नोंदी' : "Any notes about today's collection"}
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>

              {/* Summary metrics */}
              {totalL > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">{isMarathi ? 'एकूण संकलन' : 'Total Collected'}</div>
                    <div className="stat-value" style={{ fontSize: '22px', color: '#0F62FE' }}>{totalL}{L}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{isMarathi ? 'कर्मचाऱ्यांना नियुक्त' : 'Assigned to Staff'}</div>
                    <div className="stat-value" style={{ fontSize: '22px', color: overAllocated ? '#DA1E28' : '#161616' }}>
                      {totalAssigned.toFixed(1)}{L}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{isMarathi ? 'शिल्लक' : 'Unallocated'}</div>
                    <div className="stat-value" style={{ fontSize: '22px', color: unallocated > 0 ? '#FF832B' : '#24A148' }}>
                      {unallocated.toFixed(1)}{L}
                    </div>
                  </div>
                </div>
              )}

              {overAllocated && (
                <div style={{ backgroundColor: '#FFF1F1', border: '1px solid #DA1E28', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '8px', fontSize: '13px', color: '#DA1E28' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  {isMarathi
                    ? `कर्मचारी कोटा (${totalAssigned.toFixed(1)}${L}) एकूण संकलनापेक्षा (${totalL}${L}) जास्त आहे.`
                    : `Staff quotas (${totalAssigned.toFixed(1)}L) exceed total collection (${totalL}L). Reduce quotas before saving.`}
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={saving || !totalLiters || overAllocated}
                style={{ height: '48px', fontSize: '15px' }}
              >
                {saving
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {isMarathi ? 'जतन होत आहे...' : 'Saving...'}</>
                  : <><Save size={16} /> {isMarathi ? 'संकलन जतन करा' : 'Save Collection'}</>}
              </button>
            </div>

            {/* Right — Staff quota assignment */}
            <div>
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{isMarathi ? 'कर्मचारी कोटा नियुक्ती' : 'Staff Quota Assignment'}</h3>
                <p style={{ fontSize: '13px', color: '#525252', marginBottom: '20px' }}>
                  {isMarathi
                    ? 'प्रत्येक कर्मचाऱ्याला किती लिटर वितरण करता येईल ते नियुक्त करा.'
                    : 'Assign how many liters each staff member can deliver today. Staff cannot exceed their quota.'}
                </p>

                {staff.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <h3>{isMarathi ? 'कर्मचारी नाहीत' : 'No staff members'}</h3>
                    <p>{isMarathi ? 'कोटा नियुक्त करण्यासाठी कर्मचारी जोडा.' : 'Add staff from the Staff page to assign quotas.'}</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {staff.map(s => {
                      const assigned = parseFloat(quotas[s._id] || 0);
                      const delivered = deliveredByStaff[s._id] || 0;
                      const pct = assigned > 0 ? Math.min(100, (delivered / assigned) * 100) : 0;
                      const overDelivered = delivered > assigned && assigned > 0;

                      return (
                        <div key={s._id} style={{ backgroundColor: '#F4F4F4', border: '1px solid #E0E0E0', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.name}</div>
                              <div style={{ fontSize: '12px', color: '#8D8D8D' }}>{s.phone}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number" min="0" step="0.5"
                                placeholder="0"
                                value={quotas[s._id] || ''}
                                onChange={e => setQuotas(prev => ({ ...prev, [s._id]: e.target.value }))}
                                style={{
                                  width: '80px', height: '36px', padding: '0 10px',
                                  border: '1px solid #8D8D8D', fontSize: '14px', fontWeight: 700,
                                  textAlign: 'center', fontFamily: 'inherit',
                                  backgroundColor: '#FFFFFF', outline: 'none'
                                }}
                              />
                              <span style={{ fontSize: '13px', color: '#525252' }}>{L}</span>
                            </div>
                          </div>

                          {/* Delivery progress */}
                          {assigned > 0 && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#525252', marginBottom: '4px' }}>
                                <span>{isMarathi ? 'वितरित' : 'Delivered'}: <strong>{delivered.toFixed(1)}{L}</strong></span>
                                <span style={{ color: overDelivered ? '#DA1E28' : '#525252' }}>
                                  {isMarathi ? 'कोटा' : 'Quota'}: {assigned.toFixed(1)}{L}
                                </span>
                              </div>
                              <div style={{ height: '6px', backgroundColor: '#E0E0E0', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  backgroundColor: overDelivered ? '#DA1E28' : pct >= 100 ? '#24A148' : '#0F62FE',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              {pct >= 100 && (
                                <div style={{ fontSize: '11px', color: '#24A148', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={11} /> {isMarathi ? 'कोटा पूर्ण' : 'Quota fulfilled'}
                                </div>
                              )}
                            </>
                          )}
                          {!assigned && delivered > 0 && (
                            <div style={{ fontSize: '12px', color: '#8D8D8D', marginTop: '4px' }}>
                              {isMarathi ? `${delivered.toFixed(1)}${L} वितरित (कोटा नाही)` : `Delivered ${delivered.toFixed(1)}L (no quota set)`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Today's delivery summary */}
                {totalDeliveredToday > 0 && (
                  <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#DEFBE6', border: '1px solid #24A148' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0E6027', marginBottom: '4px' }}>
                      {isMarathi ? 'आज एकूण वितरित' : 'Total Delivered Today'}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#0E6027' }}>
                      {totalDeliveredToday.toFixed(1)}{L}
                    </div>
                    {totalL > 0 && (
                      <div style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>
                        {isMarathi
                          ? `${totalL}${L} संकलनापैकी (${((totalDeliveredToday / totalL) * 100).toFixed(0)}% वितरित)`
                          : `of ${totalL}L collected (${((totalDeliveredToday / totalL) * 100).toFixed(0)}% distributed)`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── MAIN ENTRY SWITCHER ─────────────────────────────────────────────────────────
const DailyCollection = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: 'auto' }} />
      </div>
    );
  }

  if (user.ownerRole === 'dairy_owner') {
    return <DailyCollectionDailyOwner />;
  }

  return <DailyCollectionMilkSupplier />;
};

export default DailyCollection;
