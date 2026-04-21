import {
    doc,
    updateDoc,
    setDoc,
    serverTimestamp,
    getDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DonationStatus } from '../config/types';

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Accept a reservation request and create a chat room with OTP
 */
export const acceptReservation = async (
    donationId: string,
    donorId: string,
    ngoId: string,
    ngoName: string,
    donorName: string
) => {
    const chatRoomId = `${donationId}_${ngoId}`;
    const otp = generateOTP();

    // Create or update Chat Room with OTP
    const chatRef = doc(db, 'chatRooms', chatRoomId);
    await setDoc(chatRef, {
        id: chatRoomId,
        donorId,
        receiverId: ngoId, // matching terminology in chatRoom schema
        donationId,
        handoverOtp: otp,
        otpVerified: false,
        donorName,
        receiverName: ngoName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: 'Reservation accepted. OTP generated for handover.',
    }, { merge: true });

    // Update Donation with chatRoomId
    const donationRef = doc(db, 'donations', donationId);
    await updateDoc(donationRef, {
        chatRoomId,
        status: 'reserved' as DonationStatus, // Ensure it stays reserved
    });

    return chatRoomId;
};

/**
 * Decline a reservation request
 */
export const declineReservation = async (donationId: string) => {
    const donationRef = doc(db, 'donations', donationId);
    await updateDoc(donationRef, {
        status: 'available' as DonationStatus,
        reservedByNgoId: null,
        reservedByNgoName: null,
    });
};

/**
 * Verify Handover OTP and complete donation
 */
export const verifyHandoverOTP = async (
    chatRoomId: string,
    enteredOtp: string,
    donationId: string
) => {
    const chatRef = doc(db, 'chatRooms', chatRoomId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        throw new Error('Chat room not found');
    }

    const chatData = chatSnap.data();
    if (chatData.handoverOtp !== enteredOtp) {
        throw new Error('Invalid OTP. Please try again.');
    }

    // Mark OTP as verified
    await updateDoc(chatRef, {
        otpVerified: true,
        updatedAt: serverTimestamp(),
        lastMessage: 'Handover verified! Donation completed.',
    });

    // Mark Donation as completed
    const donationRef = doc(db, 'donations', donationId);
    await updateDoc(donationRef, {
        status: 'completed' as DonationStatus,
        completedAt: Timestamp.now(),
    });

    return true;
};
