import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// User types
export const UserRoleSchema = z.enum(['donor', 'ngo', 'admin', 'pharmacist']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  geohash: z.string(),
  address: z.string().optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const UserSchema = z.object({
  uid: z.string(),
  role: UserRoleSchema,
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: LocationSchema.optional(),
  organizationType: z.string().optional(), // For NGOs: charity, hospital, etc.
  registrationNumber: z.string().optional(), // For NGOs and Donors
  verified: z.boolean().default(false), // Admin verification status
  createdAt: z.instanceof(Timestamp),
});
export type User = z.infer<typeof UserSchema>;

// Donation types
export const DonationStatusSchema = z.enum(['available', 'reserved', 'completed', 'cancelled']);
export type DonationStatus = z.infer<typeof DonationStatusSchema>;

export const DonationSchema = z.object({
  id: z.string(),
  donorId: z.string(),
  title: z.string(), // Medicine name (renamed from 'name' to match rules)
  description: z.string(), // Required per rules
  category: z.string(), // Medicine category (required per rules)
  quantity: z.number(),
  status: DonationStatusSchema,
  createdAt: z.instanceof(Timestamp),
  // Optional extra fields (not enforced by rules but used by app)
  batchNo: z.string().optional(),
  manufacturer: z.string().optional(),
  expiryDate: z.instanceof(Timestamp).optional(),
  mrp: z.number().optional(),
  photos: z.array(z.string()).optional(),
  donorName: z.string().optional(),
  geo: LocationSchema.optional(),
  matchedNgoId: z.string().optional(),
  matchedNgoName: z.string().optional(),
  reservedByNgoId: z.string().optional(),
  reservedByNgoName: z.string().optional(),
  chatRoomId: z.string().optional(),
  completedAt: z.instanceof(Timestamp).optional(),
});
export type Donation = z.infer<typeof DonationSchema>;

// NGO Request types
export const RequestStatusSchema = z.enum(['open', 'fulfilled', 'cancelled']);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const MedicineRequestSchema = z.object({
  id: z.string(),
  ngoId: z.string(),
  title: z.string(), // Medicine name (renamed from 'medicineName' to match rules)
  description: z.string(), // Required per rules
  category: z.string(), // Medicine category (required per rules)
  quantityNeeded: z.number(), // Renamed from 'quantity' to match rules
  status: RequestStatusSchema,
  createdAt: z.instanceof(Timestamp),
  // Optional extra fields (not enforced by rules but used by app)
  ngoName: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  reason: z.string().optional(),
  geo: LocationSchema.optional(),
  matchedDonationId: z.string().optional(),
});
export type MedicineRequest = z.infer<typeof MedicineRequestSchema>;

// Match types
export const MatchStatusSchema = z.enum(['pending', 'donor_confirmed', 'ngo_confirmed', 'both_confirmed', 'rejected']);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const DonationMatchSchema = z.object({
  id: z.string(),
  donationId: z.string(),
  requestId: z.string(),
  donorId: z.string(),
  ngoId: z.string(),
  matchScore: z.number(),
  distance: z.number(), // in km
  status: MatchStatusSchema,
  donorConfirmed: z.boolean().default(false),
  ngoConfirmed: z.boolean().default(false),
  createdAt: z.instanceof(Timestamp),
  confirmedAt: z.instanceof(Timestamp).optional(),
});
export type DonationMatch = z.infer<typeof DonationMatchSchema>;

// OCR types
export const ParsedFieldsSchema = z.object({
  name: z.string().optional(),
  batchNo: z.string().optional(),
  manufacturer: z.string().optional(),
  expiryDate: z.string().optional(),
  mrp: z.number().optional(),
  mfdDate: z.string().optional(),
  type: z.string().optional(),
});
export type ParsedFields = z.infer<typeof ParsedFieldsSchema>;

// Price advice types
export const PriceAdviceSchema = z.object({
  discountPct: z.number(),
  suggestedPrice: z.number(),
  daysToExpiry: z.number(),
  tier: z.string(),
});
export type PriceAdvice = z.infer<typeof PriceAdviceSchema>;

// Form schemas
export const DonationUploadFormSchema = z.object({
  title: z.string().min(1, 'Medicine name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  // Optional fields for additional details
  batchNo: z.string().optional(),
  manufacturer: z.string().optional(),
  expiryDate: z.string().optional().refine((dateStr) => {
    if (!dateStr) return true; // Optional field, skip if empty
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 60;
  }, "Expiry date must be at least 2 months (60 days) from today"),
  mrp: z.number().optional(),
  declaration: z.boolean().refine(val => val === true, 'You must confirm the declaration'),
});
export type DonationUploadForm = z.infer<typeof DonationUploadFormSchema>;

export const RequestFormSchema = z.object({
  title: z.string().min(1, 'Medicine name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  quantityNeeded: z.number().min(1, 'Quantity must be at least 1'),
  // Optional fields
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  reason: z.string().min(10, 'Please provide a detailed reason').optional(),
});
export type RequestForm = z.infer<typeof RequestFormSchema>;

export const MedicineUploadFormSchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
  batchNo: z.string().min(1, 'Batch number is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  expiryDate: z.string().min(1, 'Expiry date is required').refine((dateStr) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 60;
  }, "Expiry date must be at least 2 months (60 days) from today"),
  mrp: z.number().min(0, 'MRP must be positive'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  declaration: z.boolean().refine(val => val === true, 'You must confirm the declaration'),
});
export type MedicineUploadForm = z.infer<typeof MedicineUploadFormSchema>;

export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;

export const SignupFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: UserRoleSchema,
  phone: z.string().optional(),
  organizationType: z.string().optional(),
  registrationNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export type SignupForm = z.infer<typeof SignupFormSchema>;

// Ved AI types
export const VedAIResponseSchema = z.object({
  question: z.string(),
  // Generic answer field for simple QA responses
  answer: z.string().optional(),
  // Context classification (optional)
  context: z.enum(['donation', 'request', 'general', 'medicine_info']).optional(),
  // Suggestions for follow-up questions (optional)
  suggestions: z.array(z.string()).optional(),
  // Extended fields for medicine information (Zapier webhook payload)
  dosage: z.string().optional(),
  contraindications: z.array(z.string()).optional(),
  sideEffects: z.array(z.string()).optional(),
  precautions: z.array(z.string()).optional(),
  generalAdvice: z.string().optional(),
});
export type VedAIResponse = z.infer<typeof VedAIResponseSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.instanceof(Timestamp),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Donate: undefined;
  Request: undefined;
  Matches: undefined;
  Admin: undefined;
  Profile: undefined;
  MyDonations: undefined;
  MyRequests: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  DonationDetails: { donationId: string };
  RequestDetails: { requestId: string };
  MatchDetails: { matchId: string };
  Location: undefined;
  VedAI: undefined;
  Connection: { matchId: string };
  MedicineDetails: { medicineId: string };
  ChatScreen: { chatRoomId: string; donationId: string };
  ImpactCertificate: {
    donorName: string;
    medicineName: string;
    ngoName: string;
    quantity: number;
    completedAt: string;
  };
};

// Medicine types
export const MedicineSchema = z.object({
  id: z.string(),
  name: z.string(),
  batchNo: z.string(),
  manufacturer: z.string(),
  expiryDate: z.instanceof(Timestamp),
  mrp: z.number(),
  price: z.number(),
  quantity: z.number(),
  pharmacyId: z.string(),
  pharmacyName: z.string(),
  geo: LocationSchema,
  status: z.enum(['active', 'paused', 'soldout']),
  description: z.string(),
  photos: z.array(z.string()),
  frontPhoto: z.string().optional(),
  expiryLabelPhoto: z.string().optional(),
  createdAt: z.instanceof(Timestamp),
});
export type Medicine = z.infer<typeof MedicineSchema>;

// Cart types
export const CartItemSchema = z.object({
  medicineId: z.string(),
  name: z.string(),
  price: z.number(),
  qty: z.number(),
  pharmacyId: z.string(),
  pharmacyName: z.string(),
  manufacturer: z.string(),
  photo: z.string().optional(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  updatedAt: z.instanceof(Timestamp),
});
export type Cart = z.infer<typeof CartSchema>;

