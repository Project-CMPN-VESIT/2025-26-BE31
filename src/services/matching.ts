import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { DonationMatch, Donation, MedicineRequest } from '../config/types';
import { calculateDistance } from '../utils/distance';

/**
 * Calculate match score between donation and request
 * Based on: medicine name similarity, distance, urgency, expiry date
 */
export const calculateMatchScore = (
  donation: Donation,
  request: MedicineRequest
): number => {
  let score = 0;

  // Medicine name match (40 points)
  const donationName = donation.title.toLowerCase();
  const requestName = request.title.toLowerCase();
  if (donationName === requestName) {
    score += 40;
  } else if (donationName.includes(requestName) || requestName.includes(donationName)) {
    score += 25;
  }

  // Quantity match (20 points)
  if (donation.quantity >= request.quantityNeeded) {
    score += 20;
  } else {
    score += (donation.quantity / request.quantityNeeded) * 20;
  }

  // Distance (20 points) - closer is better
  const distance = calculateDistance(
    donation.geo.lat,
    donation.geo.lng,
    request.geo.lat,
    request.geo.lng
  );
  if (distance < 10) score += 20;
  else if (distance < 50) score += 15;
  else if (distance < 100) score += 10;
  else if (distance < 200) score += 5;

  // Urgency match (10 points)
  if (donation.urgency === request.urgency) {
    score += 10;
  } else if (request.urgency === 'high') {
    score += 5;
  }

  // Expiry date (10 points) - more time is better
  const daysToExpiry = Math.floor(
    (donation.expiryDate.toMillis() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysToExpiry > 180) score += 10;
  else if (daysToExpiry > 90) score += 7;
  else if (daysToExpiry > 30) score += 5;
  else if (daysToExpiry > 0) score += 2;

  return Math.min(100, Math.round(score));
};

/**
 * Find best matches for a donation
 */
export const findMatchesForDonation = async (
  donationId: string,
  maxMatches: number = 5
): Promise<Array<{ request: MedicineRequest; score: number; distance: number }>> => {
  const donation = await getDoc(doc(db, 'donations', donationId));
  if (!donation.exists()) {
    throw new Error('Donation not found');
  }

  const donationData = { ...donation.data(), id: donation.id } as Donation;

  // Get open requests
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef,
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  );
  const requestsSnapshot = await getDocs(q);
  const requests = requestsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MedicineRequest));

  // Calculate scores for each request
  const matches = requests.map(request => {
    const score = calculateMatchScore(donationData, request);
    const distance = calculateDistance(
      donationData.geo.lat,
      donationData.geo.lng,
      request.geo.lat,
      request.geo.lng
    );
    return { request, score, distance };
  });

  // Sort by score and return top matches
  return matches
    .filter(match => match.score >= 30) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches);
};

/**
 * Find best matches for a request
 */
export const findMatchesForRequest = async (
  requestId: string,
  maxMatches: number = 5
): Promise<Array<{ donation: Donation; score: number; distance: number }>> => {
  const request = await getDoc(doc(db, 'requests', requestId));
  if (!request.exists()) {
    throw new Error('Request not found');
  }

  const requestData = { ...request.data(), id: request.id } as MedicineRequest;

  // Get available donations
  const donationsRef = collection(db, 'donations');
  const q = query(
    donationsRef,
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  const donationsSnapshot = await getDocs(q);
  const donations = donationsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Donation));

  // Calculate scores for each donation
  const matches = donations.map(donation => {
    const score = calculateMatchScore(donation, requestData);
    const distance = calculateDistance(
      donation.geo.lat,
      donation.geo.lng,
      requestData.geo.lat,
      requestData.geo.lng
    );
    return { donation, score, distance };
  });

  // Sort by score and return top matches
  return matches
    .filter(match => match.score >= 30) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches);
};

/**
 * Create a match between donation and request
 */
export const createMatch = async (
  donationId: string,
  requestId: string,
  donorId: string,
  ngoId: string,
  matchScore: number,
  distance: number
): Promise<string> => {
  const matchesRef = collection(db, 'matches');
  const match = {
    donationId,
    requestId,
    donorId,
    ngoId,
    matchScore,
    distance,
    status: 'pending',
    donorConfirmed: false,
    ngoConfirmed: false,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(matchesRef, match);
  console.log('✅ Match created with ID:', docRef.id);
  return docRef.id;
};

/**
 * Get match by ID
 */
export const getMatch = async (id: string): Promise<DonationMatch | null> => {
  const matchRef = doc(db, 'matches', id);
  const matchSnap = await getDoc(matchRef);
  return matchSnap.exists() ? { ...matchSnap.data(), id } as DonationMatch : null;
};

/**
 * Update match status
 */
export const updateMatch = async (id: string, updates: Partial<DonationMatch>) => {
  const matchRef = doc(db, 'matches', id);
  await updateDoc(matchRef, updates);
};

/**
 * Confirm match by donor
 */
export const confirmMatchByDonor = async (matchId: string) => {
  const match = await getMatch(matchId);
  if (!match) throw new Error('Match not found');

  const updates: Partial<DonationMatch> = {
    donorConfirmed: true,
  };

  if (match.ngoConfirmed) {
    updates.status = 'both_confirmed';
    updates.confirmedAt = Timestamp.now();
  } else {
    updates.status = 'donor_confirmed';
  }

  await updateMatch(matchId, updates);
};

/**
 * Confirm match by NGO
 */
export const confirmMatchByNgo = async (matchId: string) => {
  const match = await getMatch(matchId);
  if (!match) throw new Error('Match not found');

  const updates: Partial<DonationMatch> = {
    ngoConfirmed: true,
  };

  if (match.donorConfirmed) {
    updates.status = 'both_confirmed';
    updates.confirmedAt = Timestamp.now();
  } else {
    updates.status = 'ngo_confirmed';
  }

  await updateMatch(matchId, updates);
};

/**
 * Get matches for a donor
 */
export const getMatchesByDonor = async (donorId: string): Promise<DonationMatch[]> => {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('donorId', '==', donorId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DonationMatch));
};

/**
 * Get matches for an NGO
 */
export const getMatchesByNgo = async (ngoId: string): Promise<DonationMatch[]> => {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('ngoId', '==', ngoId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DonationMatch));
};
