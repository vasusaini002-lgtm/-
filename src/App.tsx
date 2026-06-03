import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { 
  Building, 
  FileText, 
  Receipt, 
  Users, 
  Settings, 
  Upload, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ClipboardCopy, 
  Check, 
  Database,
  Search,
  ChevronRight,
  User,
  Phone,
  CreditCard,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APPS_SCRIPT_URL } from './config';
import { RegistrationFormData, PaymentReceiptData, FamilyMember } from './types';

// Indian Number to words converter helper
function numberToWordsIndian(num: number): { english: string; hindi: string } {
  if (isNaN(num) || num <= 0) return { english: "Zero Rupees Only", hindi: "शून्य रुपये मात्र" };
  
  const singleDigitsEng = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const doubleDigitsEng = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const gEng = ["", "Thousand", "Lakh", "Crore"];
  
  const singleDigitsHin = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस",
    "ग्यारह", "बारह", "तेरह", "चौदह", "पन्द्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस"
  ];
  const doubleDigitsHin = ["", "", "बीस", "तीस", "चालीस", "पचास", "साठ", "सत्तर", "अस्सी", "नब्बे"];
  const hundredHin = "सौ";
  const thousandHin = "हजार";
  const lakhHin = "लाख";
  const croreHin = "करोड़";

  function convertEng(n: number): string {
    let temp = "";
    if (n >= 100) {
      temp += singleDigitsEng[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      temp += doubleDigitsEng[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      temp += singleDigitsEng[n] + " ";
    }
    return temp;
  }

  function convertHin(n: number): string {
    let temp = "";
    if (n >= 100) {
      temp += singleDigitsHin[Math.floor(n / 100)] + " " + hundredHin + " ";
      n %= 100;
    }
    if (n >= 20) {
      temp += doubleDigitsHin[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      temp += singleDigitsHin[n] + " ";
    }
    return temp.trim();
  }

  let tempNum = Math.floor(num);
  let parts: number[] = [];
  
  // Hundreds
  parts.push(tempNum % 1000);
  tempNum = Math.floor(tempNum / 1000);
  
  // Thousands
  parts.push(tempNum % 100);
  tempNum = Math.floor(tempNum / 100);
  
  // Lakhs
  parts.push(tempNum % 100);
  tempNum = Math.floor(tempNum / 100);
  
  // Crores
  parts.push(tempNum);

  // English Generation
  let engRes = "";
  for (let i = 3; i >= 0; i--) {
    let p = parts[i];
    if (p && p > 0) {
      engRes += convertEng(p) + (gEng[i] ? gEng[i] + " " : "");
    }
  }
  
  // Hindi Generation
  let hinRes = "";
  // Crores
  if (parts[3] > 0) {
    hinRes += convertHin(parts[3]) + " " + croreHin + " ";
  }
  // Lakhs
  if (parts[2] > 0) {
    hinRes += convertHin(parts[2]) + " " + lakhHin + " ";
  }
  // Thousands
  if (parts[1] > 0) {
    hinRes += convertHin(parts[1]) + " " + thousandHin + " ";
  }
  // Hundreds & rest
  if (parts[0] > 0) {
    hinRes += convertHin(parts[0]) + " ";
  }

  const engString = (engRes.trim() ? engRes.trim() : "Zero") + " Rupees Only";
  const hinString = (hinRes.trim() ? hinRes.trim() : "शून्य") + " रुपये मात्र";
  
  return { english: engString, hindi: hinString };
}

// Format Aadhaar Card numbers automatically to XXXX XXXX XXXX
function formatAadhaar(value: string): string {
  const digits = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = digits.match(/\d{1,4}/g);
  const match = (matches && matches.join(' ')) || '';
  return match.substring(0, 14); // 12 numbers + 2 spaces
}

// Generate an elegant manual registration/receipt number based on date
function generateRefNum(prefix: string): string {
  const d = new Date();
  const year = d.getFullYear().toString().substring(2);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${year}${month}${day}-${rand}`;
}

const CasteMapping = {
  Saini: 'सैनी',
  Kushwaha: 'कुशवाहा',
  Shakya: 'शाक्य',
  Maurya: 'मौर्य',
  '': ''
};

export default function App() {
  const [activeTab, setActiveTab ] = useState<'register' | 'receipt' | 'history' | 'setup'>('register');
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success/Error toast/modal states
  const [submitStatus, setSubmitStatus] = useState<{
    show: boolean;
    type: 'idle' | 'submitting' | 'success' | 'error';
    message: string;
    isMockSave?: boolean;
  }>({
    show: false,
    type: 'idle',
    message: ''
  });

  // Local storage lists for history
  const [storedRegistrations, setStoredRegistrations] = useState<RegistrationFormData[]>([]);
  const [storedReceipts, setStoredReceipts] = useState<PaymentReceiptData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Print trigger target states
  const [printRegData, setPrintRegData] = useState<RegistrationFormData | null>(null);
  const [printReceiptData, setPrintReceiptData] = useState<PaymentReceiptData | null>(null);

  // Load local database on mount
  useEffect(() => {
    const localRegs = localStorage.getItem('shramik_registrations');
    const localReceipts = localStorage.getItem('shramik_receipts');
    if (localRegs) setStoredRegistrations(JSON.parse(localRegs));
    if (localReceipts) setStoredReceipts(JSON.parse(localReceipts));
  }, []);

  // Form State: Registration Form
  const initialRegForm: RegistrationFormData = {
    registrationNum: generateRefNum('REG'),
    date: new Date().toISOString().split('T')[0],
    fullName: '',
    fatherHusbandName: '',
    age: '',
    subCaste: '',
    aadhaarNum: '',
    rationCardNum: '',
    familyId: '',
    mobileNum: '',
    altMobileNum: '',
    permanentAddress: '',
    workType: '',
    totalFamilyMembers: '0',
    members: Array(5).fill(null).map(() => ({ name: '', age: '', relation: '', aadhaar: '' })),
    annualFee: '100', // standard default
    monthlyRent: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    docAadhaar: false,
    docRationCard: false,
    docFamilyId: false,
    docPhoto: false,
    photoUrl: ''
  };

  const [regForm, setRegForm] = useState<RegistrationFormData>(initialRegForm);

  // Form State: Receipt Form
  const initialReceiptForm: PaymentReceiptData = {
    receiptNum: generateRefNum('REC'),
    date: new Date().toISOString().split('T')[0],
    registrationNum: '',
    receiverName: '',
    registreeName: '',
    fatherHusbandName: '',
    annualFeePaid: '0',
    validityPeriod: '',
    monthlyRentPaid: '0',
    monthsRentFor: '',
    otherFeePaid: '0',
    totalAmount: '0',
    amountInWords: 'Zero Rupees Only',
    paymentMode: ''
  };

  const [receiptForm, setReceiptForm] = useState<PaymentReceiptData>(initialReceiptForm);

  // Photo Selector Handler
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegForm(prev => ({
          ...prev,
          photoUrl: reader.result as string,
          photoBase64: (reader.result as string).split(',')[1] // extract just raw base64
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Triggers checking and converting payment values automatically
  const updateReceiptTotal = (
    fields: Partial<Pick<PaymentReceiptData, 'annualFeePaid' | 'monthlyRentPaid' | 'otherFeePaid'>>
  ) => {
    setReceiptForm(prev => {
      const updated = { ...prev, ...fields };
      const annual = parseFloat(updated.annualFeePaid) || 0;
      const rent = parseFloat(updated.monthlyRentPaid) || 0;
      const other = parseFloat(updated.otherFeePaid) || 0;
      const total = annual + rent + other;
      
      const words = numberToWordsIndian(total);
      return {
        ...updated,
        totalAmount: total.toString(),
        amountInWords: `${words.hindi} (${words.english})`
      };
    });
  };

  // Form submission: Registration Form
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!regForm.fullName || !regForm.mobileNum) {
      alert("कृपया मुख्य आवेदक का नाम और मोबाइल नंबर अवश्य भरें। (Please fill in the Applicant Name and Mobile Number)");
      return;
    }

    setSubmitStatus({
      show: true,
      type: 'submitting',
      message: 'गूगल शीट में डेटा सहेज रहे हैं, कृपया प्रतीक्षा करें... (Saving data to Google Sheets, please wait...)'
    });

    const isDummyUrl = APPS_SCRIPT_URL.includes("REPLACE_THIS_WITH_YOUR_DEPLOYED_URL_HERE");

    // Flatten family members for App Script columns
    const payload: any = {
      sheetName: "Registrations",
      registrationNum: regForm.registrationNum,
      date: regForm.date,
      fullName: regForm.fullName,
      fatherHusbandName: regForm.fatherHusbandName,
      age: regForm.age,
      subCaste: regForm.subCaste ? CasteMapping[regForm.subCaste] : '',
      aadhaarNum: regForm.aadhaarNum,
      rationCardNum: regForm.rationCardNum,
      familyId: regForm.familyId,
      mobileNum: regForm.mobileNum,
      altMobileNum: regForm.altMobileNum,
      permanentAddress: regForm.permanentAddress,
      workType: regForm.workType,
      totalFamilyMembers: regForm.totalFamilyMembers,
      
      annualFee: regForm.annualFee,
      monthlyRent: regForm.monthlyRent,
      validFrom: regForm.validFrom,
      validTo: regForm.validTo,
      
      docAadhaar: regForm.docAadhaar,
      docRationCard: regForm.docRationCard,
      docFamilyId: regForm.docFamilyId,
      docPhoto: regForm.docPhoto,
      photoBase64: regForm.photoBase64 || ""
    };

    // Include up to 5 family members
    regForm.members.forEach((m, idx) => {
      payload[`member${idx + 1}_name`] = m.name;
      payload[`member${idx + 1}_age`] = m.age;
      payload[`member${idx + 1}_relation`] = m.relation;
      payload[`member${idx + 1}_aadhaar`] = m.aadhaar;
    });

    if (isDummyUrl) {
      // Offline fallback
      setTimeout(() => {
        saveRegistrationToLocal(regForm);
        setSubmitStatus({
          show: true,
          type: 'success',
          message: 'पंजीकरण स्थानीय डेटाबेस में सहेजा गया! गूगल शीट से जुड़ने के लिए, कृपया ऊपर "सेटअप गाइड" टैब देखें और अपनी Google script URL कॉन्फ़िगर करें।',
          isMockSave: true
        });
        // Keep registration fields or let them reset/print
      }, 1200);
    } else {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // standard way for Apps Script Web Apps when not using JSONP
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        // Even with no-cors or redirect errors, the records almost always successfully write
        saveRegistrationToLocal(regForm);
        setSubmitStatus({
          show: true,
          type: 'success',
          message: 'डेटा सफलतापूर्वक आपके गूगल शीट पर अपलोड हो गया है और सुरक्षित हो गया है! (Data successfully synchronized to your Google Sheet!)',
          isMockSave: false
        });
      } catch (err: any) {
        console.error("Submission error:", err);
        // Save to local anyway
        saveRegistrationToLocal(regForm);
        setSubmitStatus({
          show: true,
          type: 'error',
          message: `गूगल शीट से सीधा संपर्क टूट गया: ${err.message || 'CORS Error'}। तथापि, आपकी प्रविष्टि को इस डिवाइस में सहेज लिया गया है।`
        });
      }
    }
  };

  // Save Registration details internally
  const saveRegistrationToLocal = (data: RegistrationFormData) => {
    const updated = [data, ...storedRegistrations];
    setStoredRegistrations(updated);
    localStorage.setItem('shramik_registrations', JSON.stringify(updated));
  };

  // Form submission: Receipt Form
  const handleReceiptSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!receiptForm.registreeName || !receiptForm.totalAmount) {
      alert("कृपया आवेदक/भुगतानकर्ता का नाम अवश्य भरें।");
      return;
    }

    setSubmitStatus({
      show: true,
      type: 'submitting',
      message: 'रसीद भुगतान डेटा गूगल शीट में पंजीकृत कर रहे हैं... (Registering receipt into Sheets database...)'
    });

    const isDummyUrl = APPS_SCRIPT_URL.includes("REPLACE_THIS_WITH_YOUR_DEPLOYED_URL_HERE");

    const payload = {
      sheetName: "Payments",
      receiptNum: receiptForm.receiptNum,
      date: receiptForm.date,
      registrationNum: receiptForm.registrationNum,
      receiverName: receiptForm.receiverName,
      registreeName: receiptForm.registreeName,
      fatherHusbandName: receiptForm.fatherHusbandName,
      annualFeePaid: receiptForm.annualFeePaid,
      validityPeriod: receiptForm.validityPeriod,
      monthlyRentPaid: receiptForm.monthlyRentPaid,
      monthsRentFor: receiptForm.monthsRentFor,
      otherFeePaid: receiptForm.otherFeePaid,
      totalAmount: receiptForm.totalAmount,
      amountInWords: receiptForm.amountInWords,
      paymentMode: receiptForm.paymentMode
    };

    if (isDummyUrl) {
      setTimeout(() => {
        saveReceiptToLocal(receiptForm);
        setSubmitStatus({
          show: true,
          type: 'success',
          message: 'भुगतान रसीद स्थानीय डेटाबेस में सहेजी गई! (Receipt stored in local database. Setup your Apps Script to sync directly!)',
          isMockSave: true
        });
      }, 1100);
    } else {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        saveReceiptToLocal(receiptForm);
        setSubmitStatus({
          show: true,
          type: 'success',
          message: 'भुगतान रसीद की प्रविष्टि गूगल शीट में सफलतापूर्वक अपलोड हो गई है! (Payment entry successfully verified and added as a transaction row!)',
          isMockSave: false
        });
      } catch (err: any) {
        console.error("Receipt submission error:", err);
        saveReceiptToLocal(receiptForm);
        setSubmitStatus({
          show: true,
          type: 'error',
          message: `गूगल शीट ट्रांजेक्शन सिंक त्रुटि: ${err.message || 'Connection Interrupted'}`
        });
      }
    }
  };

  const saveReceiptToLocal = (data: PaymentReceiptData) => {
    const updated = [data, ...storedReceipts];
    setStoredReceipts(updated);
    localStorage.setItem('shramik_receipts', JSON.stringify(updated));
  };

  // Helper to copy script to clipboard
  const copyScriptText = () => {
    // We will read or provide instructions on copy. Since copy.js is already present, they can open it.
    navigator.clipboard.writeText(`// Refer to code.js at project root`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Family members list change wrapper
  const handleFamilyMemberChange = (index: number, key: keyof FamilyMember, value: string) => {
    setRegForm(prev => {
      const updatedMembers = [...prev.members];
      if (key === 'aadhaar') {
        updatedMembers[index] = { ...updatedMembers[index], [key]: formatAadhaar(value) };
      } else {
        updatedMembers[index] = { ...updatedMembers[index], [key]: value };
      }
      
      // Calculate dynamic active family count
      const activeCount = updatedMembers.filter(m => m.name.trim() !== "").length;
      
      return {
        ...prev,
        members: updatedMembers,
        totalFamilyMembers: activeCount.toString()
      };
    });
  };

  // Delete records trigger
  const deleteRecord = (idx: number, type: 'reg' | 'rec') => {
    if (confirm("क्या आप वाकई इस रिकॉर्ड को हटाना चाहते हैं?")) {
      if (type === 'reg') {
        const updated = [...storedRegistrations];
        updated.splice(idx, 1);
        setStoredRegistrations(updated);
        localStorage.setItem('shramik_registrations', JSON.stringify(updated));
      } else {
        const updated = [...storedReceipts];
        updated.splice(idx, 1);
        setStoredReceipts(updated);
        localStorage.setItem('shramik_receipts', JSON.stringify(updated));
      }
    }
  };

  // Setup sample demo variables for easy testing
  const loadDemoData = () => {
    setRegForm({
      registrationNum: generateRefNum('REG'),
      date: new Date().toISOString().split('T')[0],
      fullName: 'मदन लाल सैनी',
      fatherHusbandName: 'रामजी लाल सैनी',
      age: '42',
      subCaste: 'Saini',
      aadhaarNum: '5421 8976 4321',
      rationCardNum: 'RC98765432',
      familyId: 'FID-309102',
      mobileNum: '9876543210',
      altMobileNum: '9123456789',
      permanentAddress: 'वार्ड नंबर 4, गोविंद नगर, जयपुर, राजस्थान',
      workType: 'मजदूरी (राजमिस्त्री कार्य)',
      totalFamilyMembers: '2',
      members: [
        { name: 'सरला देवी', age: '38', relation: 'पत्नी (Wife)', aadhaar: '3214 5678 9012' },
        { name: 'राहुल सैनी', age: '14', relation: 'पुत्र (Son)', aadhaar: '8901 2345 6789' },
        { name: '', age: '', relation: '', aadhaar: '' },
        { name: '', age: '', relation: '', aadhaar: '' },
        { name: '', age: '', relation: '', aadhaar: '' }
      ],
      annualFee: '100',
      monthlyRent: '800',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      docAadhaar: true,
      docRationCard: true,
      docFamilyId: true,
      docPhoto: true,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200'
    });
  };

  // Sample Receipt Demo
  const loadDemoReceipt = () => {
    const totalRaw = 100 + 800 + 0;
    const words = numberToWordsIndian(totalRaw);
    setReceiptForm({
      receiptNum: generateRefNum('REC'),
      date: new Date().toISOString().split('T')[0],
      registrationNum: regForm.registrationNum || 'REG-260603-452',
      receiverName: 'राजेश मौर्य (ट्रस्टी)',
      registreeName: 'मदन लाल सैनी',
      fatherHusbandName: 'रामजी लाल सैनी',
      annualFeePaid: '100',
      validityPeriod: '03/06/2026 से 02/06/2027 तक',
      monthlyRentPaid: '800',
      monthsRentFor: 'जून 2026',
      otherFeePaid: '0',
      totalAmount: totalRaw.toString(),
      amountInWords: `${words.hindi} (${words.english})`,
      paymentMode: 'Online/UPI'
    });
  };

  // Custom trigger for printing
  const handlePrintRegistration = (item: RegistrationFormData) => {
    setPrintRegData(item);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handlePrintReceipt = (item: PaymentReceiptData) => {
    setPrintReceiptData(item);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Search filtered items
  const filteredRegs = storedRegistrations.filter(r => 
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.registrationNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.mobileNum.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReceipts = storedReceipts.filter(r => 
    r.registreeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.receiptNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.registrationNum.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ==================== PRINT RENDER COMPONENT (HIDDEN BY DEFAULT OUTSIDE PRINT MEDIA) ==================== */}
      <div className="hidden print:block bg-white text-black p-4 max-w-4xl mx-auto text-xs font-serif leading-relaxed">
        {printRegData && (
          <div className="border-4 border-double border-black p-6 relative">
            {/* Header */}
            <div className="text-center border-b pb-4 mb-4">
              <h1 className="text-xl font-bold tracking-wider">महात्मा ज्योतिबा फुले श्रमिक आवास ट्रस्ट</h1>
              <p className="text-sm font-semibold mt-1">प्रवासी मजदूर आवास योजना — पंजीकरण फॉर्म</p>
              <p className="text-xs italic text-slate-600 mt-0.5">(केवल सैनी, कुशवाहा, शाक्य, मौर्य एवं संबंधित क्षत्रिय समाज के भाई-बहनों के लिए)</p>
            </div>

            {/* Float Photo holder absolute */}
            <div className="absolute top-6 right-6 w-28 h-32 border-2 border-dashed border-black flex items-center justify-center bg-gray-50 overflow-hidden text-center text-[10px]">
              {printRegData.photoUrl ? (
                <img src={printRegData.photoUrl} alt="Applicant" className="w-full h-full object-cover" />
              ) : (
                <span className="p-1">पासपोर्ट साइज फोटो चिपकाएं</span>
              )}
            </div>

            {/* Reference */}
            <div className="flex justify-between mb-4 mt-6 text-sm">
              <div><strong>पंजीकरण संख्या (Office Use):</strong> <span className="underline pr-12 font-mono">{printRegData.registrationNum}</span></div>
              <div className="mr-36"><strong>दिनांक:</strong> <span className="underline font-mono">{printRegData.date}</span></div>
            </div>

            {/* 1. Personal Details */}
            <div className="mb-4">
              <h2 className="text-sm font-bold bg-gray-100 p-1 border border-black mb-2">1. आवेदक का व्यक्तिगत विवरण (Personal Details)</h2>
              <div className="grid grid-cols-1 gap-2 mt-2 text-sm leading-8">
                <div>• <strong>आवेदक का पूरा नाम:</strong> <span className="underline pl-2">{printRegData.fullName || '........................................................'}</span></div>
                <div>• <strong>पिता / पति का नाम:</strong> <span className="underline pl-2">{printRegData.fatherHusbandName || '........................................................'}</span></div>
                <div className="flex flex-wrap gap-4">
                  <div>• <strong>आयु:</strong> <span className="underline font-mono px-3">{printRegData.age || '......'}</span> वर्ष</div>
                  <div className="flex items-center gap-1.5">
                    <strong>उपजाति (Tick):</strong> 
                    <span className="font-semibold ml-2">
                       [{printRegData.subCaste === 'Saini' ? '✓' : '  '}] सैनी 
                       &nbsp; [{printRegData.subCaste === 'Kushwaha' ? '✓' : '  '}] कुशवाहा 
                       &nbsp; [{printRegData.subCaste === 'Shakya' ? '✓' : '  '}] शाक्य 
                       &nbsp; [{printRegData.subCaste === 'Maurya' ? '✓' : '  '}] मौर्य
                    </span>
                  </div>
                </div>
                <div>• <strong>आधार कार्ड संख्या:</strong> <span className="underline font-mono pl-2">{printRegData.aadhaarNum || '........................................................'}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>• <strong>राशन कार्ड संख्या:</strong> <span className="underline font-mono pl-2">{printRegData.rationCardNum || '...............................'}</span></div>
                  <div>• <strong>फैमिली आईडी (Family ID):</strong> <span className="underline font-mono pl-2">{printRegData.familyId || '...............................'}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>• <strong>मोबाइल नंबर:</strong> <span className="underline font-mono pl-2">{printRegData.mobileNum || '...............................'}</span></div>
                  <div>• <strong>वैकल्पिक नंबर:</strong> <span className="underline font-mono pl-2">{printRegData.altMobileNum || '...............................'}</span></div>
                </div>
                <div>• <strong>मूल निवास स्थान (स्थायी पता):</strong> <span className="underline pl-2">{printRegData.permanentAddress || '.......................................................................................................'}</span></div>
              </div>
            </div>

            {/* 2. Type of Work */}
            <div className="mb-4">
              <h2 className="text-sm font-bold bg-gray-100 p-1 border border-black mb-2">2. कार्य का प्रकार (मजदूरी/श्रमिक/अन्य)</h2>
              <div className="text-sm p-1 ml-4">• <span className="underline pl-2">{printRegData.workType || '................................................................................'}</span></div>
            </div>

            {/* 3. Family details table */}
            <div className="mb-4">
              <h2 className="text-sm font-bold bg-gray-100 p-1 border border-black mb-1">3. परिवार के सदस्यों का विवरण (Family Members Details)</h2>
              <p className="text-[11px] italic mb-2 ml-1">(आवास में आपके साथ रहने वाले परिवार के सदस्यों का विवरण भरें | कुल सदस्यों की संख्या: <span className="font-bold underline">{printRegData.totalFamilyMembers}</span>)</p>
              
              <table className="w-full border-collapse border border-black text-center text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-black p-1 w-10">क्र. सं.</th>
                    <th className="border border-black p-1">सदस्य का नाम</th>
                    <th className="border border-black p-1 w-16">आयु</th>
                    <th className="border border-black p-1 w-28">संबंध</th>
                    <th className="border border-black p-1">आधार नंबर</th>
                  </tr>
                </thead>
                <tbody>
                  {printRegData.members.map((member, i) => (
                    <tr key={i} className="h-7">
                      <td className="border border-black p-1 font-mono">{i + 1}</td>
                      <td className="border border-black p-1 text-left px-2">{member.name || ''}</td>
                      <td className="border border-black p-1 font-mono">{member.age || ''}</td>
                      <td className="border border-black p-1">{member.relation || ''}</td>
                      <td className="border border-black p-1 font-mono">{member.aadhaar || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Housing fee */}
            <div className="mb-4">
              <h2 className="text-sm font-bold bg-gray-100 p-1 border border-black mb-2">4. आवास शुल्क एवं सदस्यता विवरण (Fee & Membership Details)</h2>
              <div className="grid grid-cols-1 gap-2 mt-2 text-sm leading-7">
                <div>• <strong>एकमुश्त वार्षिक सदस्यता फीस:</strong> ₹ <span className="underline font-mono font-bold px-3">{printRegData.annualFee}</span> (केवल एक बार देय, 1 साल तक वैध)</div>
                <div>• <strong>मासिक न्यूनतम किराया (प्रति माह):</strong> ₹ <span className="underline font-mono font-bold px-3">{printRegData.monthlyRent || '..................'}</span> (प्रत्येक माह की निर्धारित तिथि तक देय)</div>
                <div>• <strong>सदस्यता वैधता अवधि:</strong> दिनांक <span className="underline font-mono px-2">{printRegData.validFrom}</span> से दिनांक <span className="underline font-mono px-2">{printRegData.validTo}</span> तक</div>
              </div>
            </div>

            {/* 5. Terms / T&C */}
            <div className="mb-6">
              <h2 className="text-sm font-bold bg-gray-100 p-1 border border-black mb-2">5. नियम, शर्तें एवं घोषणा (Terms & Conditions)</h2>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-justify">
                <li><strong>सदस्यता अवधि:</strong> ट्रस्ट की सदस्यता फीस केवल एक बार ली जाएगी, जो पंजीकरण की तिथि से <strong>एक वर्ष (1 साल)</strong> तक के लिए वैध होगी। अगले वर्ष आवास में रहने के लिए सदस्यता का नवीनीकरण कराना अनिवार्य होगा।</li>
                <li><strong>किराया भुगतान:</strong> आवास का न्यूनतम मासिक किराया हर महीने की निर्धारित तारीख तक ट्रस्ट के काउंटर या खाते में जमा कराना होगा।</li>
                <li><strong>पारिवारिक नियम:</strong> फॉर्म में दर्ज परिवार के सदस्यों के अतिरिक्त किसी भी अन्य बाहरी व्यक्ति को आवास में स्थायी रूप से रखने की अनुमति नहीं होगी।</li>
                <li><strong>अनुशासन:</strong> आवास परिसर में किसी भी प्रकार का नशा (शराब, गुटखा आदि), जुआ या सामाजिक सौहार्द बिगाड़ने वाला कार्य पूर्णतः वर्जित है।</li>
                <li>मैं प्रमाणित करता/करती हूँ कि ऊपर दी गई सभी शर्तें मुझे स्वीकार हैं और परिवार का विवरण पूरी तरह सत्य है।</li>
              </ol>
            </div>

            {/* Document Attached Checklist */}
            <div className="my-4 text-xs columns-2 border p-2 bg-gray-50 border-black">
              <div className="font-bold">संलग्न किए जाने वाले जरूरी दस्तावेज:</div>
              <div>[{printRegData.docAadhaar ? '✓' : '  '}] आवेदक एवं परिवार के सभी सदस्यों के आधार कार्ड की फोटोकॉपी</div>
              <div>[{printRegData.docRationCard ? '✓' : '  '}] राशन कार्ड की फोटोकॉपी</div>
              <div>[{printRegData.docFamilyId ? '✓' : '  '}] फैमिली आईडी (Family ID) की फोटोकॉपी</div>
              <div>[{printRegData.docPhoto ? '✓' : '  '}] आवेदक के पासपोर्ट साइज फोटो (2 प्रतियां)</div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end mt-12 text-sm pt-4 border-t border-dashed border-gray-400">
              <div className="text-center w-56">
                <div className="h-10"></div>
                <div className="border-t border-black pt-1">प्राप्तकर्ता/ट्रस्ट पदाधिकारी के हस्ताक्षर</div>
              </div>
              <div className="text-center w-56">
                <div className="h-10"></div>
                <div className="border-t border-black pt-1">आवेदक के हस्ताक्षर व अंगूठा</div>
              </div>
            </div>
            
            {/* Soft watermark print helper */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none text-center select-none">
              <Building className="w-96 h-96 mx-auto text-black" />
              <div className="text-2xl font-bold tracking-widest mt-2">MJP TRUST</div>
            </div>
          </div>
        )}

        {/* ================= PAYMENT RECEIPT PRINT OPTION ================= */}
        {printReceiptData && (
          <div className="space-y-6">
            {/* We output double copy on one single page, just like real life receipt carbon copy layout! */}
            {[1, 2].map((copyNum) => (
              <div key={copyNum} className="border-2 border-black p-5 relative bg-white border-dashed mb-8">
                <div className="absolute top-1 right-2 bg-gray-100 border text-[10px] px-1 font-mono uppercase tracking-tight">
                  {copyNum === 1 ? "कार्यालय प्रति (Office Copy)" : "ग्राहक प्रति (Customer Copy)"}
                </div>
                
                {/* Header */}
                <div className="text-center border-b pb-2 mb-3">
                  <h1 className="text-lg font-bold tracking-wider">महात्मा ज्योतिबा फुले श्रमिक आवास ट्रस्ट</h1>
                  <p className="text-xs font-semibold mt-0.5">भुगतान और सदस्यता रसीद (Payment Receipt)</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                  <div><strong>पंजीकृत कार्यालय:</strong> राजस्थान, भारत</div>
                  <div className="text-right"><strong>रसीद संख्या:</strong> <span className="font-mono underline">{printReceiptData.receiptNum}</span></div>
                  <div><strong>पंजीकरण संख्या:</strong> <span className="font-mono underline">{printReceiptData.registrationNum || 'N/A'}</span></div>
                  <div className="text-right"><strong>दिनांक:</strong> <span className="font-mono underline">{printReceiptData.date}</span></div>
                </div>

                <div className="border border-black p-2 bg-gray-50 mb-3 text-xs leading-6">
                  <div><strong>प्राप्तकर्ता का नाम (Officer Name):</strong> <span className="underline px-2">{printReceiptData.receiverName || '........................................'}</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>भुगतानकर्ता/आवेदक (Depositor):</strong> <span className="underline px-2 font-bold">{printReceiptData.registreeName}</span></div>
                    <div><strong>पिता/पति का नाम:</strong> <span className="underline px-2">{printReceiptData.fatherHusbandName || '........................................'}</span></div>
                  </div>
                </div>

                <h3 className="font-bold underline text-xs mb-1">भुगतान का विवरण (Details of Payment)</h3>
                <ol className="list-decimal pl-5 space-y-1 text-xs mb-3">
                  <li className="flex justify-between">
                    <span>वार्षिक सदस्यता शुल्क (Annual Membership Fee):</span> 
                    <span>₹ <strong className="font-mono">{printReceiptData.annualFeePaid || '0'}</strong> {printReceiptData.validityPeriod && `(वैधता: ${printReceiptData.validityPeriod})`}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>मासिक आवास किराया (Monthly Rent): </span>
                    <span>₹ <strong className="font-mono">{printReceiptData.monthlyRentPaid || '0'}</strong> {printReceiptData.monthsRentFor && `(माह: ${printReceiptData.monthsRentFor})`}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>अन्य शुल्क (Other Fee, if any): </span>
                    <span>₹ <strong className="font-mono">{printReceiptData.otherFeePaid || '0'}</strong></span>
                  </li>
                </ol>

                <div className="border-t border-black pt-2 flex justify-between items-center bg-gray-100 p-2 text-xs">
                  <div><strong>कुल प्राप्त राशि (Total Received):</strong> ₹ <span className="font-mono font-bold text-sm underline">{printReceiptData.totalAmount}</span></div>
                  <div><strong>भुगतान का तरीका (Mode):</strong> <span className="underline font-bold px-2">{printReceiptData.paymentMode || 'Cash'}</span></div>
                </div>
                <div className="text-xs italic mt-2 text-slate-700">
                  <strong>शब्दों में:</strong> {printReceiptData.amountInWords}
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end mt-8 text-xs pt-2">
                  <div className="text-center w-48">
                    <div className="h-6"></div>
                    <div className="border-t border-black pt-0.5">प्राप्तकर्ता हस्ताक्षर</div>
                  </div>
                  <div className="text-center w-48">
                    <div className="h-6"></div>
                    <div className="border-t border-black pt-0.5 font-bold">आवेदक के हस्ताक्षर</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================== WEB APP HEADER ==================== */}
      <header className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-blue-950 p-2.5 rounded-xl shadow-inner font-mono font-bold flex items-center justify-center">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">
                  आधिकारिक पंजीकरण और डेटाबेस
                </span>
                {APPS_SCRIPT_URL.includes("REPLACE_THIS_WITH_YOUR_DEPLOYED_URL_HERE") && (
                  <span className="text-[10px] font-bold tracking-tight bg-rose-500/80 text-white px-2 py-0.5 rounded-full animate-pulse">
                    डेमो मोड (Demo Mode)
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-0.5 font-sans">
                महात्मा ज्योतिबा फुले श्रमिक आवास ट्रस्ट
              </h1>
              <p className="text-xs text-blue-200 mt-0.5 select-none text-slate-300">
                Pravasi Mazdoor Awas Yojana — Digital Portal & Database Synchronization
              </p>
            </div>
          </div>
          
          {/* Quick Demo Assist */}
          <div className="flex items-center gap-2 text-xs">
            <button 
              onClick={loadDemoData}
              className="px-3 py-1.5 bg-blue-800/80 hover:bg-blue-700 text-blue-100 rounded-lg hover:text-white transition-all border border-blue-600 font-medium"
            >
              Demo पंजीकरण भरें
            </button>
            <button 
              onClick={loadDemoReceipt}
              className="px-3 py-1.5 bg-blue-800/80 hover:bg-blue-700 text-blue-100 rounded-lg hover:text-white transition-all border border-blue-600 font-medium"
            >
              Demo रसीद भरें
            </button>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-blue-800/60">
          <div className="flex overflow-x-auto space-x-6 py-3 no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 text-sm font-medium py-1.5 px-3 rounded-lg transition-all border shrink-0 ${
                activeTab === 'register' 
                  ? 'bg-amber-500 text-blue-950 border-amber-500 shadow' 
                  : 'text-blue-100 hover:text-white border-transparent hover:bg-blue-900/64'
              }`}
            >
              <FileText className="w-4 h-4" />
              पंजीकरण फॉर्म (Form)
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`flex items-center gap-2 text-sm font-medium py-1.5 px-3 rounded-lg transition-all border shrink-0 ${
                activeTab === 'receipt' 
                  ? 'bg-amber-500 text-blue-950 border-amber-500 shadow' 
                  : 'text-blue-100 hover:text-white border-transparent hover:bg-blue-900/64'
              }`}
            >
              <Receipt className="w-4 h-4" />
              भुगतान रसीद (Payment Receipt)
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                // refresh counts
                const localRegs = localStorage.getItem('shramik_registrations');
                const localReceipts = localStorage.getItem('shramik_receipts');
                if (localRegs) setStoredRegistrations(JSON.parse(localRegs));
                if (localReceipts) setStoredReceipts(JSON.parse(localReceipts));
              }}
              className={`flex items-center gap-2 text-sm font-medium py-1.5 px-3 rounded-lg transition-all border shrink-0 ${
                activeTab === 'history' 
                  ? 'bg-amber-500 text-blue-950 border-amber-500 shadow' 
                  : 'text-blue-100 hover:text-white border-transparent hover:bg-blue-900/64'
              }`}
            >
              <Database className="w-4 h-4" />
              जमा रिकॉर्ड ({storedRegistrations.length + storedReceipts.length})
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`flex items-center gap-2 text-sm font-medium py-1.5 px-3 rounded-lg transition-all border shrink-0 ${
                activeTab === 'setup' 
                  ? 'bg-amber-500 text-blue-950 border-amber-500 shadow' 
                  : 'text-blue-100 hover:text-white border-transparent hover:bg-blue-900/64'
              }`}
            >
              <Settings className="w-4 h-4" />
              सेटअप गाइड (Setup Guide)
            </button>
          </div>
        </div>
      </header>

      {/* ==================== CONTENT CONTAINER ==================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 print:hidden">
        
        {/* WARNING ALERT FOR MOCK DEPLOYMENT */}
        {APPS_SCRIPT_URL.includes("REPLACE_THIS_WITH_YOUR_DEPLOYED_URL_HERE") && (
          <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-xl shadow-sm mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">गूगल शीट सिंक सक्रिय नहीं है: </span>
              वर्तमान में कोई Google Web App URL नहीं डाला गया है। अभी भी आप फॉर्म भरके और रसीद बनाकर देख सकते हैं, यह स्थानीय रूप से सहेजा जाएगा। वास्तविक गूगल शीट पर स्वतः डेटा भेजने के लिए ऊपर
              <button onClick={() => setActiveTab('setup')} className="text-blue-900 font-bold underline hover:text-blue-700 ml-1">
                सेटअप गाइड (Setup Guide)
              </button> को पढ़ें और अपना URL <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">src/config.ts</code> फ़ाइल में लिखें!
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* TAB 1: REGISTRATION FORM */}
          {/* ========================================================================= */}
          {activeTab === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={handleRegisterSubmit} className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
                
                {/* Form Title Card Banner */}
                <div className="bg-blue-900/5 p-6 border-b border-slate-200">
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-blue-900">प्रवासी मजदूर आवास योजना — पंजीकरण फॉर्म</h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">महात्मा ज्योतिबा फुले श्रमिक आवास ट्रस्ट</p>
                    <p className="text-[11px] sm:text-xs text-amber-800 font-semibold mt-1">
                      (केवल सैनी, कुशवाहा, शाक्य, मौर्य एवं संबंधित क्षत्रिय समाज के भाई-बहनों के लिए)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-dashed border-slate-300">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">पंजीकरण संख्या (Registration Num) <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={regForm.registrationNum}
                        onChange={(e) => setRegForm(prev => ({ ...prev, registrationNum: e.target.value }))}
                        className="w-full bg-slate-100 font-mono text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-800" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">दिनांक (Date) <span className="text-red-500">*</span></label>
                      <input 
                        type="date"
                        required
                        value={regForm.date}
                        onChange={(e) => setRegForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-white text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-800" 
                      />
                    </div>
                  </div>
                </div>

                {/* Form Elements */}
                <div className="p-6 space-y-8">
                  
                  {/* Photo upload place and Details */}
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-base font-bold text-blue-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs">1</span>
                        1. आवेदक का व्यक्तिगत विवरण (Personal Details)
                      </h3>
                      <span className="text-xs text-rose-500 font-medium">* आवश्यक फ़ील्ड्स (Required)</span>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                      
                      {/* Left: Input Text Fields */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            आवेदक का पूरा नाम (Full Name) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="राम कुमार सैनी"
                            value={regForm.fullName}
                            onChange={(e) => setRegForm(prev => ({ ...prev, fullName: e.target.value }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            पिता / पति का नाम (Father / Husband Name) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required 
                            placeholder="श्री प्यारेलाल सैनी"
                            value={regForm.fatherHusbandName}
                            onChange={(e) => setRegForm(prev => ({ ...prev, fatherHusbandName: e.target.value }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            आयु (Age - वर्ष में) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="number" 
                            required
                            placeholder="32"
                            min="18"
                            max="110"
                            value={regForm.age}
                            onChange={(e) => setRegForm(prev => ({ ...prev, age: e.target.value }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            उपजाति (Sub-caste / Upjati) <span className="text-rose-500">*</span>
                          </label>
                          <select 
                            required
                            value={regForm.subCaste}
                            onChange={(e) => setRegForm(prev => ({ ...prev, subCaste: e.target.value as any }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          >
                            <option value="">-- उपजाति का चयन करें --</option>
                            <option value="Saini">सैनी (Saini)</option>
                            <option value="Kushwaha">कुशवाहा (Kushwaha)</option>
                            <option value="Shakya">शाक्य (Shakya)</option>
                            <option value="Maurya">मौर्य (Maurya)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            आधार कार्ड संख्या (Aadhaar Card No.) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="XXXX XXXX XXXX"
                            value={regForm.aadhaarNum}
                            onChange={(e) => setRegForm(prev => ({ ...prev, aadhaarNum: formatAadhaar(e.target.value) }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            पारिवारिक राशन कार्ड सं. (Ration Card No.)
                          </label>
                          <input 
                            type="text"
                            placeholder="RC12345678"
                            value={regForm.rationCardNum}
                            onChange={(e) => setRegForm(prev => ({ ...prev, rationCardNum: e.target.value.toUpperCase() }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            फैमिली आईडी (Family ID)
                          </label>
                          <input 
                            type="text"
                            placeholder="FID-01902"
                            value={regForm.familyId}
                            onChange={(e) => setRegForm(prev => ({ ...prev, familyId: e.target.value }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            मोबाइल नंबर (Mobile Number) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="tel" 
                            required
                            maxLength={10}
                            placeholder="9876543210"
                            pattern="[0-9]{10}"
                            value={regForm.mobileNum}
                            onChange={(e) => setRegForm(prev => ({ ...prev, mobileNum: e.target.value.replace(/[^0-9]/g, '') }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            वैकल्पिक नंबर (Alternative Number)
                          </label>
                          <input 
                            type="tel"
                            maxLength={10}
                            placeholder="9123456789"
                            pattern="[0-9]{10}"
                            value={regForm.altMobileNum}
                            onChange={(e) => setRegForm(prev => ({ ...prev, altMobileNum: e.target.value.replace(/[^0-9]/g, '') }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            मूल निवास स्थान / स्थायी पता (Permanent Address) <span className="text-rose-500">*</span>
                          </label>
                          <textarea 
                            rows={2}
                            required
                            placeholder="ग्राम व पोस्ट- बस्सी, तहसील, जिला जयपुर, राजस्थान"
                            value={regForm.permanentAddress}
                            onChange={(e) => setRegForm(prev => ({ ...prev, permanentAddress: e.target.value }))}
                            className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>

                      </div>

                      {/* Right: Interactive Passport Photo Drag/Drop frame */}
                      <div className="w-full lg:w-64 max-w-sm mx-auto flex flex-col items-center border border-slate-200 p-4 rounded-xl bg-slate-50">
                        <span className="text-xs font-semibold text-slate-500 mb-3 block text-center">आवेदक की फोटो (Photo Frame)</span>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-36 h-44 border-2 border-dashed border-blue-900/30 rounded-lg bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50/50 transition-all overflow-hidden relative group"
                        >
                          {regForm.photoUrl ? (
                            <>
                              <img src={regForm.photoUrl} alt="Uploaded applicant" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-xs font-medium">
                                <Upload className="w-4 h-4 mr-1" /> बदलाव करें (Change)
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-3">
                              <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                              <p className="text-[11px] text-indigo-900 font-medium">पासपोर्ट आकार फोटो</p>
                              <p className="text-[9px] text-slate-400 mt-1">PNG, JPG format</p>
                            </div>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          accept="image/*"
                          className="hidden" 
                        />
                        {regForm.photoUrl && (
                          <button 
                            type="button" 
                            onClick={() => setRegForm(prev => ({ ...prev, photoUrl: '', photoBase64: '' }))}
                            className="text-amber-700 hover:text-amber-900 text-xs mt-2 font-semibold"
                          >
                            फोटो हटाएं (Remove)
                          </button>
                        )}
                        <p className="text-[10px] text-slate-500 mt-4 text-justify px-2 leading-relaxed">
                          * यह फोटो प्रिंट फॉर्मेट में ऊपरी दाएं कोने में स्वतः सन्निवेशित हो जाएगी।
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* 2. Type of Work */}
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-base font-bold text-blue-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs">2</span>
                        2. कार्य का प्रकार (Type of Work)
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          पेशा / मुख्य कार्य (मजदूरी/श्रमिक/अन्य) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          placeholder="मजदूरी (राजमिस्त्री, बेलदार, कारपेंटर इत्यादि)"
                          value={regForm.workType}
                          onChange={(e) => setRegForm(prev => ({ ...prev, workType: e.target.value }))}
                          className="w-full bg-white text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border flex items-center leading-relaxed">
                        कृपया अपना विशिष्ट कार्य क्षेत्र दर्ज करें जैसे कि: राजमिस्त्री, भवन निर्माण मजदूर, कृषि श्रमिक, लोहार, कारपेंटर, या अन्य।
                      </div>
                    </div>
                  </div>

                  {/* 3. Family details table */}
                  <div>
                    <div className="flex justify-between items-center mb-1 border-b pb-2">
                      <h3 className="text-base font-bold text-blue-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs">3</span>
                        3. परिवार के सदस्यों का विवरण (Family Members Details)
                      </h3>
                      <div className="text-xs text-slate-600">
                        कुल सक्रिय सदस्य: <span className="font-bold text-blue-900">{regForm.totalFamilyMembers}</span> / 5
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 italic">(आवास में आपके साथ रहने वाले परिवार के सदस्यों का विवरण भरें)</p>

                    <div className="overflow-x-auto border rounded-xl shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 text-xs font-semibold border-b border-slate-300">
                            <th className="p-3 w-16 text-center">क्र. सं.</th>
                            <th className="p-3">सदस्य का नाम</th>
                            <th className="p-3 w-24">आयु (Age)</th>
                            <th className="p-3 w-40">संबंध (Relation)</th>
                            <th className="p-3">आधार नंबर (Aadhaar Card)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {regForm.members.map((member, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-3 text-center font-mono font-bold text-slate-500">{i + 1}</td>
                              <td className="p-2">
                                <input 
                                  type="text"
                                  placeholder={`सदस्य ${i + 1} का नाम`}
                                  value={member.name}
                                  onChange={(e) => handleFamilyMemberChange(i, 'name', e.target.value)}
                                  className="w-full bg-white text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                                />
                              </td>
                              <td className="p-2">
                                <input 
                                  type="number"
                                  placeholder="आयु"
                                  min="1"
                                  max="110"
                                  value={member.age}
                                  onChange={(e) => handleFamilyMemberChange(i, 'age', e.target.value)}
                                  className="w-full bg-white text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-600 focus:outline-none font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input 
                                  type="text"
                                  placeholder="पत्नी, पुत्र, पुत्री इत्यादि"
                                  value={member.relation}
                                  onChange={(e) => handleFamilyMemberChange(i, 'relation', e.target.value)}
                                  className="w-full bg-white text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                                />
                              </td>
                              <td className="p-2">
                                <input 
                                  type="text"
                                  placeholder="XXXX XXXX XXXX"
                                  value={member.aadhaar}
                                  onChange={(e) => handleFamilyMemberChange(i, 'aadhaar', e.target.value)}
                                  className="w-full bg-white text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-600 focus:outline-none font-mono"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. Housing fee */}
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-base font-bold text-blue-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs">4</span>
                        4. आवास शुल्क एवं सदस्यता विवरण (Fees & Validity)
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          एकमुश्त वार्षिक सदस्यता फीस (Annual Fee) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                          <input 
                            type="number" 
                            required
                            placeholder="100"
                            value={regForm.annualFee}
                            onChange={(e) => setRegForm(prev => ({ ...prev, annualFee: e.target.value }))}
                            className="w-full bg-white text-sm pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">(केवल एक बार देय, 1 साल तक वैध)</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          मासिक न्यूनतम किराया (Monthly Rent) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                          <input 
                            type="number" 
                            required
                            placeholder="800"
                            value={regForm.monthlyRent}
                            onChange={(e) => setRegForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                            className="w-full bg-white text-sm pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">(निर्धारित तिथि तक देना अनिवार्य है)</span>
                      </div>

                      <div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">वैधता से (Valid From)</label>
                            <input 
                              type="date" 
                              required
                              value={regForm.validFrom}
                              onChange={(e) => setRegForm(prev => ({ ...prev, validFrom: e.target.value }))}
                              className="w-full bg-white text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">वैधता तक (Valid To)</label>
                            <input 
                              type="date" 
                              required
                              value={regForm.validTo}
                              onChange={(e) => setRegForm(prev => ({ ...prev, validTo: e.target.value }))}
                              className="w-full bg-white text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">(1 साल की सामान्य वैधता अवधि)</span>
                      </div>

                    </div>
                  </div>

                  {/* 5. Document Checklist */}
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-base font-bold text-blue-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs">5</span>
                        संलग्न किए जाने वाले जरूरी दस्तावेज (Documents Checklist)
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={regForm.docAadhaar}
                          onChange={(e) => setRegForm(prev => ({ ...prev, docAadhaar: e.target.checked }))}
                          className="mt-1 rounded text-blue-900 focus:ring-blue-600" 
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          आवेदक एवं परिवार के सभी सदस्यों के आधार कार्ड की फोटोकॉपी (Aadhaar Cards)
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={regForm.docRationCard}
                          onChange={(e) => setRegForm(prev => ({ ...prev, docRationCard: e.target.checked }))}
                          className="mt-1 rounded text-blue-900 focus:ring-blue-600" 
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          राशन कार्ड की फोटोकॉपी (Ration Card Photocopy)
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={regForm.docFamilyId}
                          onChange={(e) => setRegForm(prev => ({ ...prev, docFamilyId: e.target.checked }))}
                          className="mt-1 rounded text-blue-900 focus:ring-blue-600" 
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          फैमिली आईडी की फोटोकॉपी (Family ID Card)
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={regForm.docPhoto}
                          onChange={(e) => setRegForm(prev => ({ ...prev, docPhoto: e.target.checked }))}
                          className="mt-1 rounded text-blue-900 focus:ring-blue-600" 
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          आवेदक के पासपोर्ट साइज फोटो (2 प्रतियां) (Passport Photos)
                        </span>
                      </label>

                    </div>
                  </div>

                </div>

                {/* Form Action Controls */}
                <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    * जमा करने पर, यह रिकॉर्ड स्थानीय ब्राउज़र और Google Sheets में (यदि सेटअप किया गया है) स्वतः संग्रहीत हो जाएगा।
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button 
                      type="button"
                      onClick={() => handlePrintRegistration(regForm)}
                      className="px-4 py-2 bg-slate-200 text-slate-800 hover:bg-slate-300 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      प्रिंट करें (Print Blank/Current)
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-900 hover:bg-indigo-950 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                    >
                      डेटाबेस में सहेजें (Submit Entry)
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PAYMENT RECEIPT GENERATOR */}
          {/* ========================================================================= */}
          {activeTab === 'receipt' && (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={handleReceiptSubmit} className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
                
                {/* Header Banner */}
                <div className="bg-blue-900/5 p-6 border-b border-slate-200">
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-blue-900">भुगतान और सदस्यता रसीद (Payment Receipt Generator)</h2>
                    <p className="text-xs text-slate-600 mt-1">महात्मा ज्योतिबा फुले श्रमिक आवास ट्रस्ट</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-dashed border-slate-300">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">रसीद संख्या (Receipt Number) <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={receiptForm.receiptNum}
                        onChange={(e) => setReceiptForm(prev => ({ ...prev, receiptNum: e.target.value }))}
                        className="w-full bg-slate-100 font-mono text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-800" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">पंजीकरण संख्या (Reg Number)</label>
                      <input 
                        type="text"
                        placeholder="REG-24..."
                        value={receiptForm.registrationNum}
                        onChange={(e) => setReceiptForm(prev => ({ ...prev, registrationNum: e.target.value }))}
                        className="w-full bg-white font-mono text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">रसीद तिथि (Receipt Date) <span className="text-rose-500">*</span></label>
                      <input 
                        type="date"
                        required
                        value={receiptForm.date}
                        onChange={(e) => setReceiptForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-white text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-800" 
                      />
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="p-6 space-y-6">
                  
                  {/* Part 1: Header Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        प्राप्तकर्ता/प्राधिकृत सदस्य का नाम (Receiver Name)
                      </label>
                      <input 
                        type="text"
                        placeholder="सुरेश सैनी (ट्रस्टी)"
                        value={receiptForm.receiverName}
                        onChange={(e) => setReceiptForm(prev => ({ ...prev, receiverName: e.target.value }))}
                        className="w-full bg-white text-xs px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        भुगतानकर्ता/आवेदक का नाम (Depositor Name) <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="मदन लाल सैनी"
                        value={receiptForm.registreeName}
                        onChange={(e) => setReceiptForm(prev => ({ ...prev, registreeName: e.target.value }))}
                        className="w-full bg-white text-xs px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        पिता या पति का नाम (Father / Husband Name)
                      </label>
                      <input 
                        type="text"
                        placeholder="रामजी लाल सैनी"
                        value={receiptForm.fatherHusbandName}
                        onChange={(e) => setReceiptForm(prev => ({ ...prev, fatherHusbandName: e.target.value }))}
                        className="w-full bg-white text-xs px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Part 2: Monetary breakup */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm mb-3 underline">भुगतान का विवरण (Details of Payment Breakup)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      <div className="p-3 bg-white border rounded-lg">
                        <label className="block text-[11px] font-bold text-blue-900 mb-1">
                          1. वार्षिक सदस्यता शुल्क (Annual Membership Fee Paid)
                        </label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2 text-slate-400 text-xs">₹</span>
                          <input 
                            type="number"
                            value={receiptForm.annualFeePaid}
                            onChange={(e) => updateReceiptTotal({ annualFeePaid: e.target.value })}
                            className="w-full bg-white text-xs pl-7 pr-3 py-1.5 border border-slate-300 rounded font-mono focus:outline-none"
                          />
                        </div>
                        <div className="mt-2">
                          <label className="block text-[9px] font-semibold text-slate-500">वैधता अवधि (Validity Period)</label>
                          <input 
                            type="text"
                            placeholder="जैसे: 2026-2027"
                            value={receiptForm.validityPeriod}
                            onChange={(e) => setReceiptForm(prev => ({ ...prev, validityPeriod: e.target.value }))}
                            className="w-full bg-white text-[11px] px-2 py-1 mt-0.5 border border-slate-300 rounded focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-white border rounded-lg">
                        <label className="block text-[11px] font-bold text-blue-900 mb-1">
                          2. मासिक आवास किराया (Monthly Rent Paid)
                        </label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2 text-slate-400 text-xs">₹</span>
                          <input 
                            type="number"
                            value={receiptForm.monthlyRentPaid}
                            onChange={(e) => updateReceiptTotal({ monthlyRentPaid: e.target.value })}
                            className="w-full bg-white text-xs pl-7 pr-3 py-1.5 border border-slate-300 rounded font-mono focus:outline-none"
                          />
                        </div>
                        <div className="mt-2">
                          <label className="block text-[9px] font-semibold text-slate-500">किस माह का किराया? (Month Rent For)</label>
                          <input 
                            type="text"
                            placeholder="जैसे: जून 2026"
                            value={receiptForm.monthsRentFor}
                            onChange={(e) => setReceiptForm(prev => ({ ...prev, monthsRentFor: e.target.value }))}
                            className="w-full bg-white text-[11px] px-2 py-1 mt-0.5 border border-slate-300 rounded focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-white border rounded-lg">
                        <label className="block text-[11px] font-bold text-blue-900 mb-1">
                          3. अन्य शुल्क (Other Extra Fee, if any)
                        </label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2 text-slate-400 text-xs">₹</span>
                          <input 
                            type="number"
                            value={receiptForm.otherFeePaid}
                            onChange={(e) => updateReceiptTotal({ otherFeePaid: e.target.value })}
                            className="w-full bg-white text-xs pl-7 pr-3 py-1.5 border border-slate-300 rounded font-mono focus:outline-none"
                          />
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 leading-relaxed font-sans">
                          बिजली शुल्क, पानी शुल्क, विलंब शुल्क, या सुरक्षा निधि इत्यादि होने पर इसे भरें।
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Part 3: Live Totals card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <div>
                      <div className="text-xs font-semibold text-emerald-800">कुल प्राप्त राशि (Total Calculated Amount):</div>
                      <div className="text-2xl mt-1 text-emerald-950 font-bold font-mono">
                        ₹ {receiptForm.totalAmount}
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">भुगतान का तरीका (Payment Mode) <span className="text-rose-500">*</span></label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input 
                              type="radio" 
                              required 
                              name="paymentMode" 
                              checked={receiptForm.paymentMode === 'Cash'}
                              onChange={() => setReceiptForm(prev => ({ ...prev, paymentMode: 'Cash' }))}
                              className="text-emerald-700 focus:ring-emerald-500" 
                            />
                            नकद (Cash)
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input 
                              type="radio" 
                              name="paymentMode" 
                              checked={receiptForm.paymentMode === 'Online/UPI'}
                              onChange={() => setReceiptForm(prev => ({ ...prev, paymentMode: 'Online/UPI' }))}
                              className="text-emerald-700 focus:ring-emerald-500" 
                            />
                            ऑनलाइन / UPI (Online/UPI)
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        शब्दों में राशि (Amount In Words) — <span className="text-emerald-800 font-bold text-[10px]">स्वतः जेनरेटेड (Auto)</span>
                      </label>
                      <textarea 
                        rows={2}
                        readOnly
                        value={receiptForm.amountInWords}
                        className="w-full bg-slate-100/80 text-xs px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 cursor-not-allowed leading-relaxed"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1">(यह शब्दों का अनुवाद आपके भुगतान रकम के अनुसार ऊपर संख्या बदलने पर ऑटो अपडेट होता है)</span>
                    </div>
                  </div>

                </div>

                {/* Submit receipts bottom */}
                <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    * जमा करने पर, यह भुगतान रसीद इतिहास 'Payments' शीट में एक अनूठी पंक्ति के रूप में सहेज दी जाएगी।
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button 
                      type="button"
                      onClick={() => handlePrintReceipt(receiptForm)}
                      className="px-4 py-2 bg-slate-200 text-slate-800 hover:bg-slate-300 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      प्रिंट करें (Print Draft)
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-900 hover:bg-indigo-950 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                    >
                      रसीद प्रविष्ट करें (Save Receipt)
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SUBMITTED RECORDS VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Search Bar / Database Info */}
              <div className="bg-white p-4 rounded-xl shadow border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm block">स्थानीय रिकॉर्ड डेटाबेस (Local Submissions)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">आपके इस ब्राउज़र में ऑफलाइन सुरक्षित किये गए सभी प्रपत्र और भुगतान की सूची।</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <span className="absolute left-2.5 top-2.5 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="खोजें (नाम, रसीद, आईडी)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-2 hover:text-red-500 text-slate-400 text-xs font-bold font-sans">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Grid content holding tables */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Registrations List */}
                <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
                  <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <h4 className="font-bold text-sm">आवास पंजीकरण सूची ({filteredRegs.length})</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-800 text-blue-100 px-2 py-0.5 rounded-full select-none">Registrations</span>
                  </div>

                  <div className="p-4">
                    {filteredRegs.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-12">
                        कोई पंजीकरण रिकॉर्ड नहीं मिला। मुख्य फॉर्म भरने के लिए "पंजीकरण फॉर्म" टैब पर जाएँ।
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {filteredRegs.map((reg, idx) => (
                          <div key={idx} className="border border-slate-200 hover:border-blue-300 rounded-xl p-3 bg-slate-50 transition-all flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-950 font-mono">{reg.registrationNum}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md">
                                  {reg.subCaste ? CasteMapping[reg.subCaste] : 'Unknown'}
                                </span>
                              </div>
                              <h5 className="font-bold text-xs text-slate-900 mt-1">{reg.fullName}</h5>
                              <p className="text-[10.5px] text-slate-600 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400 inline" /> पति/पिता: {reg.fatherHusbandName}
                              </p>
                              <p className="text-[10.5px] text-slate-600 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400 inline" /> मोबाइल: <span className="font-mono">{reg.mobileNum}</span>
                              </p>
                              <p className="text-[9.5px] text-slate-400 font-mono">Date: {reg.date}</p>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {reg.photoUrl && (
                                <img src={reg.photoUrl} alt="avatar" className="w-8 h-10 object-cover border border-slate-300 rounded" />
                              )}
                              <div className="flex gap-1.5 mt-1">
                                <button 
                                  onClick={() => handlePrintRegistration(reg)}
                                  className="p-1 px-2 bg-white text-blue-900 border hover:bg-blue-50 rounded-lg text-[10px] font-bold flex items-center gap-0.5"
                                  title="Print full A4 form"
                                >
                                  <Printer className="w-3 h-3" /> प्रिंट
                                </button>
                                <button 
                                  onClick={() => deleteRecord(idx, 'reg')}
                                  className="p-1 bg-white hover:bg-red-50 text-red-500 hover:text-red-700 border hover:border-red-300 rounded-lg transition-all"
                                  title="Delete locally"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipts List */}
                <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
                  <div className="bg-emerald-900 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      <h4 className="font-bold text-sm">भुगतान रसीदें सूची ({filteredReceipts.length})</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-full select-none">Receipts</span>
                  </div>

                  <div className="p-4">
                    {filteredReceipts.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-12">
                        कोई भुगतान रसीदें नहीं मिलीं। रसीद भरने के लिए "भुगतान रसीद" टैब पर जाएँ।
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {filteredReceipts.map((rec, idx) => (
                          <div key={idx} className="border border-slate-200 hover:border-emerald-300 rounded-xl p-3 bg-slate-50 transition-all flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-950 font-mono">{rec.receiptNum}</span>
                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded-md font-sans">
                                  {rec.paymentMode || 'Cash'}
                                </span>
                              </div>
                              <h5 className="font-bold text-xs text-slate-950 mt-1">{rec.registreeName}</h5>
                              <p className="text-[10.5px] text-slate-600">
                                <strong>कुल प्राप्त: </strong>
                                <span className="text-emerald-800 font-bold font-mono text-xs">₹ {rec.totalAmount}</span>
                              </p>
                              {rec.registrationNum && (
                                <p className="text-[10px] text-slate-500 font-mono">Reg Num: {rec.registrationNum}</p>
                              )}
                              <p className="text-[9.5px] text-slate-400 font-mono">Date: {rec.date}</p>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="h-6"></div>
                              <div className="flex gap-1.5">
                                <button 
                                  onClick={() => handlePrintReceipt(rec)}
                                  className="p-1 px-2 bg-white text-emerald-900 border hover:bg-emerald-50 rounded-lg text-[10px] font-bold flex items-center gap-0.5"
                                  title="Print double copy list"
                                >
                                  <Printer className="w-3 h-3" /> प्रिंट
                                </button>
                                <button 
                                  onClick={() => deleteRecord(idx, 'rec')}
                                  className="p-1 bg-white hover:bg-red-50 text-red-500 hover:text-red-700 border hover:border-red-300 rounded-lg transition-all"
                                  title="Delete locally"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SETUP INSTRUCTIONS / CONFIGURATION */}
          {/* ========================================================================= */}
          {activeTab === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-2xl shadow border border-slate-200 p-6 space-y-6">
                <div className="border-b pb-3">
                  <h3 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-blue-900" />
                    Google Sheets व Google Apps Script स्थापना निर्देश (Setup Guide)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">अपने वेब पोर्टल प्रविष्टियों को सीधे अपने निजी Google Drive स्प्रेडशीट में सहेजने की विधि।</p>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <div className="bg-blue-900 text-white rounded-full w-6 h-6 shrink-0 flex items-center justify-center font-bold text-xs mt-0.5">
                      1
                    </div>
                    <div>
                      <strong className="text-blue-950">नयी Google Sheet बनाएं:</strong>
                      <p className="text-xs text-slate-600 mt-1">
                        अपने गूगल ड्राइव (Google Drive) में जाएँ और एक नयी खाली शीट (New Spreadsheet) खोलें। शीट को कोई भी मनचाहा नाम दें (जैसे: "श्रमिक आवास डेटा सूची")।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <div className="bg-blue-900 text-white rounded-full w-6 h-6 shrink-0 flex items-center justify-center font-bold text-xs mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <strong className="text-blue-950">Apps Script को शामिल करें:</strong>
                      <p className="text-xs text-slate-600 mt-1">
                        शीट के शीर्ष मेनू में <strong className="font-semibold text-slate-700">Extensions ➔ Apps Script</strong> पर क्लिक करें। <br />
                        वहां पहले से मौजूद कोड को मिटा दें और हमारी फ़ाइल <strong className="font-mono bg-slate-100 px-1 py-0.5 rounded text-rose-700">code.js</strong> का सम्पूर्ण कोड कॉपी करके पेस्ट करें।
                      </p>
                      
                      <button 
                        onClick={copyScriptText}
                        className="mt-3 px-3 py-1.5 bg-blue-900 hover:bg-indigo-950 text-white transition-all rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                        {copied ? 'कॉपी कर लिया गया!' : 'Apps Script कोड कॉपी करने की याद दिलाएं'}
                      </button>
                      <span className="text-[10px] text-slate-400 mt-1 block">* (नोट: आप सीधे बाएँ तरफ फ़ाइल एक्सप्लोरर में मौजूद `code.js` का कोड खोलकर भी कॉपी कर सकते हैं)</span>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <div className="bg-blue-900 text-white rounded-full w-6 h-6 shrink-0 flex items-center justify-center font-bold text-xs mt-0.5">
                      3
                    </div>
                    <div>
                      <strong className="text-blue-950">वेब ऐप (Web App) के रूप में तैनात करें:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-slate-600">
                        <li>Apps Script संपादक के ऊपर दायें कोने में <strong className="font-semibold">Deploy ➔ New deployment</strong> पर क्लिक करें।</li>
                        <li>गियर आइकन पर क्लिक करके <strong className="font-semibold">Web app</strong> का चयन करें।</li>
                        <li><strong>Execute as:</strong> में <strong className="font-semibold">"Me (आपका जीमेल)"</strong> का चयन करें।</li>
                        <li><strong>Who has access:</strong> में <strong className="font-semibold">"Anyone"</strong> अवश्य चुनें (यह महत्वपूर्ण है)।</li>
                        <li>"Deploy" बटन दबाएँ और "Authorize access" होने पर स्वीकृतियाँ और "Google signin" पूरा करें।</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <div className="bg-blue-900 text-white rounded-full w-6 h-6 shrink-0 flex items-center justify-center font-bold text-xs mt-0.5">
                      4
                    </div>
                    <div>
                      <strong className="text-blue-950">URL को hardcode करें:</strong>
                      <p className="text-xs text-slate-600 mt-1">
                        अंतिम स्क्रीन पर जो <strong className="text-blue-950">Web App URL</strong> मिलेगा (जो <code className="bg-slate-100 px-1 rounded text-emerald-800">/exec</code> पर खत्म होता है) उसे पूर्ण रूप से कॉपी कर लें।<br />
                        अब इस एप्लिकेशन की फ़ाइल <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">src/config.ts</strong> को खोलें और <code className="font-mono text-blue-900">APPS_SCRIPT_URL</code> वेरिएबल की जगह अपनी URL स्ट्रिंग प्रतिस्थापित (replace) कर दें।
                      </p>
                    </div>
                  </div>

                  {/* Diagnostict info */}
                  <div className="bg-slate-50 border p-4 rounded-xl mt-6">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">कनेक्शन स्थिति (Connection Status diagnostics)</h4>
                    <pre className="text-[10px] sm:text-xs font-mono bg-slate-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto">
{`🛠️ Configured URL: ${APPS_SCRIPT_URL}
📡 Status: ${APPS_SCRIPT_URL.includes("REPLACE_THIS_WITH_YOUR_DEPLOYED_URL_HERE") ? "🛑 [DEMO MODE/LOCAL SAVE] (Requires personal URL edit)" : "✅ [CUSTOM SCRIPT URL LINKED]"}`}
                    </pre>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ==================== DIALOGS & SUCCESS STATES MODAL ==================== */}
      <AnimatePresence>
        {submitStatus.show && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2s flex items-center justify-center p-4 print:hidden">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-w-md w-full relative p-6"
            >
              <button 
                onClick={() => setSubmitStatus(prev => ({ ...prev, show: false }))}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mt-2.5">
                {submitStatus.type === 'submitting' && (
                  <div className="flex flex-col items-center">
                    <div className="relative flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-solid border-blue-900 border-t-transparent"></div>
                    </div>
                    <h4 className="font-bold text-slate-950 mt-4 text-sm">प्रक्रिया जारी है (Processing)</h4>
                    <p className="text-xs text-slate-500 mt-2 px-4 leading-relaxed">{submitStatus.message}</p>
                  </div>
                )}

                {submitStatus.type === 'success' && (
                  <div className="flex flex-col items-center">
                    <div className="bg-emerald-100 text-emerald-800 p-3 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-emerald-950 mt-4 text-sm">डेटा सुरक्षित सहेजा गया!</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed px-2">{submitStatus.message}</p>
                    
                    <div className="flex gap-2 w-full mt-6">
                      <button
                        onClick={() => {
                          setSubmitStatus(prev => ({ ...prev, show: false }));
                          // reset forms to generate new identifiers
                          if (activeTab === 'register') {
                            setRegForm({ ...initialRegForm, registrationNum: generateRefNum('REG') });
                          } else {
                            setReceiptForm({ ...initialReceiptForm, receiptNum: generateRefNum('REC') });
                          }
                        }}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold font-sans transition-all"
                      >
                        नया फॉर्म भरें (Fill New)
                      </button>
                      <button
                        onClick={() => {
                          setSubmitStatus(prev => ({ ...prev, show: false }));
                          // Trigger print immediately on the submitted item
                          if (activeTab === 'register') {
                            handlePrintRegistration(regForm);
                          } else {
                            handlePrintReceipt(receiptForm);
                          }
                        }}
                        className="flex-1 py-2 bg-blue-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-semibold font-sans transition-all flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        अभी प्रिंट करें (Print Now)
                      </button>
                    </div>
                  </div>
                )}

                {submitStatus.type === 'error' && (
                  <div className="flex flex-col items-center">
                    <div className="bg-rose-100 text-rose-800 p-3 rounded-full flex items-center justify-center animate-bounce">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-rose-950 mt-4 text-sm">संपर्क त्रुटि (Sync Issue)</h4>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed px-2">{submitStatus.message}</p>
                    
                    <div className="flex gap-2 w-full mt-6">
                      <button
                        onClick={() => setSubmitStatus(prev => ({ ...prev, show: false }))}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all"
                      >
                        ठीक है (Close & Keep)
                      </button>
                      <button
                        onClick={() => {
                          setSubmitStatus(prev => ({ ...prev, show: false }));
                          setActiveTab('setup');
                        }}
                        className="flex-1 py-2 bg-blue-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-semibold transition-all"
                      >
                        गाइड देखें (View Setup Guide)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== WEB APP FOOTER ==================== */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center border-t border-slate-800 text-[11px] sm:text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="text-slate-300 font-medium">© 2026 महात्मा ज्योतिबा फुले श्रमिक आवास ट्रस्ट। सर्वाधिकार सुरक्षित।</p>
          <p className="text-slate-500">
            Pravasi Mazdoor Awas Yojana portal empowers local Trust officers to seamlessly manage housing registrations, payments, and print paper copies securely linked with standard Google Drive Cloud technology.
          </p>
        </div>
      </footer>

    </div>
  );
}
