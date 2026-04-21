import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  QueryConstraint,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Donation, DonationStatus, Location } from '../config/types';

/**
 * Create a new donation
 */
export const createDonation = async (donationData: {
  title: string;
  description: string;
  category: string;
  quantity: number;
  batchNo?: string;
  manufacturer?: string;
  expiryDate?: Date;
  mrp?: number;
  photos?: string[];
}): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to create donations');
  }

  const donationsRef = collection(db, 'donations');
  const donation = {
    ...donationData,
    donorId: currentUser.uid,
    status: 'available' as DonationStatus,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(donationsRef, donation);
  console.log('✅ Donation created with ID:', docRef.id);
  return docRef.id;
};

/**
 * Get a single donation by ID
 */
export const getDonation = async (id: string): Promise<Donation | null> => {
  const donationRef = doc(db, 'donations', id);
  const donationSnap = await getDoc(donationRef);
  return donationSnap.exists() ? { ...donationSnap.data(), id } as Donation : null;
};

/**
 * Update donation
 */
export const updateDonation = async (id: string, updates: Partial<Donation>) => {
  const donationRef = doc(db, 'donations', id);
  await updateDoc(donationRef, updates);
};

/**
 * Delete donation
 */
export const deleteDonation = async (id: string) => {
  const donationRef = doc(db, 'donations', id);
  await deleteDoc(donationRef);
};

/**
 * Get all donations by a specific donor
 */
export const getDonationsByDonor = async (donorId: string): Promise<Donation[]> => {
  const donationsRef = collection(db, 'donations');
  const q = query(
    donationsRef,
    where('donorId', '==', donorId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Donation));
};

/**
 * Get available donations (not yet matched)
 */
export const getAvailableDonations = async (constraints: QueryConstraint[] = []): Promise<Donation[]> => {
  const donationsRef = collection(db, 'donations');
  const baseConstraints = [
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc'),
  ];
  const q = query(donationsRef, ...baseConstraints, ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Donation));
};

/**
 * Get all donations (for admin)
 */
export const getAllDonations = async (): Promise<Donation[]> => {
  const donationsRef = collection(db, 'donations');
  const q = query(donationsRef, orderBy('createdAt', 'desc'), limit(100));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Donation));
};

/**
 * Search donations by medicine name
 */
export const searchDonations = async (searchTerm: string): Promise<Donation[]> => {
  const donationsRef = collection(db, 'donations');
  const q = query(
    donationsRef,
    where('status', '==', 'available'),
    orderBy('name'),
    limit(50)
  );
  const querySnapshot = await getDocs(q);
  const donations = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Donation));

  // Client-side filtering
  return donations.filter(donation =>
    (donation.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
};

/**
 * Upload donation with image
 */
export const uploadDonation = async (donationData: {
  name: string;
  batchNo: string;
  manufacturer: string;
  expiryDate: Date | Timestamp | string;
  quantity: number;
  donorName: string;
  donorType?: string;
  geo: Location;
  description?: string;
  urgency?: 'low' | 'medium' | 'high';
  photos?: string[];
}): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to upload donations');
  }

  // Convert expiryDate to Timestamp
  let expiryTimestamp: Timestamp;
  if (donationData.expiryDate instanceof Timestamp) {
    expiryTimestamp = donationData.expiryDate;
  } else if (donationData.expiryDate instanceof Date) {
    expiryTimestamp = Timestamp.fromDate(donationData.expiryDate);
  } else {
    expiryTimestamp = Timestamp.fromDate(new Date(donationData.expiryDate));
  }

  const donationDoc = {
    name: donationData.name.trim(),
    batchNo: donationData.batchNo.trim(),
    manufacturer: donationData.manufacturer.trim(),
    expiryDate: expiryTimestamp,
    quantity: donationData.quantity,
    donorId: currentUser.uid,
    donorName: donationData.donorName.trim(),
    donorType: donationData.donorType || 'individual',
    geo: donationData.geo,
    status: 'available' as const,
    description: donationData.description?.trim() || '',
    urgency: donationData.urgency || 'medium',
    photos: donationData.photos || [],
    createdAt: Timestamp.now(),
  };

  try {
    const donationsRef = collection(db, 'donations');
    const docRef = await addDoc(donationsRef, donationDoc);
    console.log('✅ Donation uploaded successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('❌ Donation upload failed:', error);
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
};
/**
 * Reserve a donation (NGO)
 */
export const reserveDonation = async (donationId: string, ngoId: string, ngoName: string) => {
  const donationRef = doc(db, 'donations', donationId);
  await updateDoc(donationRef, {
    status: 'reserved' as DonationStatus,
    reservedByNgoId: ngoId,
    reservedByNgoName: ngoName,
    updatedAt: Timestamp.now(),
  });
};
