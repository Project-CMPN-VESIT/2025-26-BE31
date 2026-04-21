import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { MedicineRequest, RequestStatus, Location } from '../config/types';

/**
 * Create a new medicine request (NGO)
 */
export const createRequest = async (requestData: {
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  ngoName?: string;
  geo?: Location;
  urgency?: 'low' | 'medium' | 'high';
  reason?: string;
}): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to create requests');
  }

  const requestsRef = collection(db, 'requests');
  const request = {
    ...requestData,
    ngoId: currentUser.uid,
    status: 'open' as RequestStatus,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(requestsRef, request);
  console.log('✅ Request created with ID:', docRef.id);
  return docRef.id;
};

/**
 * Get a single request by ID
 */
export const getRequest = async (id: string): Promise<MedicineRequest | null> => {
  const requestRef = doc(db, 'requests', id);
  const requestSnap = await getDoc(requestRef);
  return requestSnap.exists() ? { ...requestSnap.data(), id } as MedicineRequest : null;
};

/**
 * Update request
 */
export const updateRequest = async (id: string, updates: Partial<MedicineRequest>) => {
  const requestRef = doc(db, 'requests', id);
  await updateDoc(requestRef, updates);
};

/**
 * Delete request
 */
export const deleteRequest = async (id: string) => {
  const requestRef = doc(db, 'requests', id);
  await deleteDoc(requestRef);
};

/**
 * Get all requests by a specific NGO
 */
export const getRequestsByNgo = async (ngoId: string): Promise<MedicineRequest[]> => {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef,
    where('ngoId', '==', ngoId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MedicineRequest));
};

/**
 * Get open requests (not yet matched)
 */
export const getOpenRequests = async (): Promise<MedicineRequest[]> => {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef,
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MedicineRequest));
};

/**
 * Get all requests (for admin)
 */
export const getAllRequests = async (): Promise<MedicineRequest[]> => {
  const requestsRef = collection(db, 'requests');
  const q = query(requestsRef, orderBy('createdAt', 'desc'), limit(100));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MedicineRequest));
};

/**
 * Search requests by medicine name
 */
export const searchRequests = async (searchTerm: string): Promise<MedicineRequest[]> => {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef,
    where('status', '==', 'open'),
    orderBy('title'),
    limit(50)
  );
  const querySnapshot = await getDocs(q);
  const requests = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MedicineRequest));

  // Client-side filtering
  return requests.filter(request =>
    request.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
};
