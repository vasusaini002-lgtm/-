export interface FamilyMember {
  name: string;
  age: string;
  relation: string;
  aadhaar: string;
}

export interface RegistrationFormData {
  registrationNum: string;
  date: string;
  fullName: string;
  fatherHusbandName: string;
  age: string;
  subCaste: 'Saini' | 'Kushwaha' | 'Shakya' | 'Maurya' | '';
  aadhaarNum: string;
  rationCardNum: string;
  familyId: string;
  mobileNum: string;
  altMobileNum: string;
  permanentAddress: string;
  workType: string;
  totalFamilyMembers: string;
  
  // Up to 5 family members
  members: FamilyMember[];
  
  // Fees
  annualFee: string;
  monthlyRent: string;
  validFrom: string;
  validTo: string;
  
  // Document checklist
  docAadhaar: boolean;
  docRationCard: boolean;
  docFamilyId: boolean;
  docPhoto: boolean;
  
  // Photo
  photoUrl?: string; // Preview URL
  photoBase64?: string; // Base64 payload for saving to Sheet
}

export interface PaymentReceiptData {
  receiptNum: string;
  date: string;
  registrationNum: string;
  receiverName: string;
  registreeName: string;
  fatherHusbandName: string;
  
  annualFeePaid: string;
  validityPeriod: string;
  monthlyRentPaid: string;
  monthsRentFor: string;
  otherFeePaid: string;
  totalAmount: string;
  amountInWords: string;
  paymentMode: 'Cash' | 'Online/UPI' | '';
}
