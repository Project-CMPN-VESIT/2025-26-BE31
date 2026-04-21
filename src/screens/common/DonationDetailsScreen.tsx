import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Linking,
  StatusBar,
  Alert,
} from 'react-native';
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { reserveDonation } from '../../services/donation';
import {
  acceptReservation,
  declineReservation,
} from '../../services/handover';

/**
 * DonationDetailsScreen
 * Shows detailed info + enables the full Reservation → Accept/Decline flow.
 */
export default function DonationDetailsScreen({ route, navigation }: any) {
  const { donationId } = route.params;
  const { user } = useAuth();
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time listener
  useEffect(() => {
    const donationRef = doc(db, 'donations', donationId);
    const unsubscribe = onSnapshot(donationRef, (snap) => {
      if (snap.exists()) {
        setDonation({ id: snap.id, ...snap.data() });
      } else {
        Toast.show({ type: 'error', text1: 'Donation not found' });
        navigation.goBack();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [donationId]);

  // ---------- Helpers ----------
  const getDaysUntilExpiry = (expiryDate: any) => {
    if (!expiryDate) return 'Unknown';
    const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    return `${diffDays} days left`;
  };

  const getExpiryColor = (expiryDate: any) => {
    if (!expiryDate) return 'text-secondary-500';
    const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
    if (diffDays < 0) return 'text-red-600';
    if (diffDays <= 30) return 'text-orange-600';
    if (diffDays <= 90) return 'text-yellow-600';
    return 'text-emerald-600';
  };

  // ---------- Actions ----------

  /** NGO taps "Request Medicine" on an available donation */
  const handleRequestMedicine = useCallback(async () => {
    if (!user || !donation) return;
    setActionLoading(true);
    try {
      // 1. Reserve the donation
      await reserveDonation(donationId, user.uid || '', user.name || '');

      // 2. Write a notification for the donor
      const notifRef = collection(db, 'notifications', donation.donorId, 'items');
      await addDoc(notifRef, {
        type: 'reservation_request',
        donationId,
        donationTitle: donation.title || donation.name || 'Medicine',
        ngoId: user.uid,
        ngoName: user.name,
        message: `${user.name} wants your donation. Tap to Accept or Decline.`,
        read: false,
        createdAt: Timestamp.now(),
      });

      Toast.show({
        type: 'success',
        text1: 'Reservation Sent!',
        text2: 'Awaiting donor acceptance.',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed', text2: e.message });
    } finally {
      setActionLoading(false);
    }
  }, [user, donation, donationId]);

  /** Donor taps "Accept" */
  const handleAccept = useCallback(async () => {
    if (!user || !donation) return;
    setActionLoading(true);
    try {
      const chatRoomId = await acceptReservation(
        donationId,
        user.uid || '',           // donorId
        donation.reservedByNgoId,
        donation.reservedByNgoName || 'NGO',
        user.name || '',
      );
      navigation.navigate('ChatScreen', { chatRoomId, donationId });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error accepting', text2: e.message });
    } finally {
      setActionLoading(false);
    }
  }, [user, donation, donationId, navigation]);

  /** Donor taps "Decline" */
  const handleDecline = useCallback(() => {
    Alert.alert(
      'Decline Reservation',
      `Are you sure you want to decline ${donation?.reservedByNgoName || 'this NGO'}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await declineReservation(donationId);
              Toast.show({ type: 'info', text1: 'Reservation declined' });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: e.message });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [donation, donationId]);

  const handleContactDonor = () => {
    if (donation?.donorPhone) {
      Linking.openURL(`tel:${donation.donorPhone}`);
    } else {
      Toast.show({ type: 'info', text1: 'No Contact Info', text2: 'Not available' });
    }
  };

  const handleGetDirections = () => {
    if (donation?.geo) {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${donation.geo.lat},${donation.geo.lng}`,
      );
    }
  };

  // ---------- Derived flags ----------
  const isNGO = user?.role === 'ngo';
  const isDonor = user?.role === 'donor';
  const isOwner = donation?.donorId === user?.uid;
  const isAvailable = donation?.status === 'available';
  const isReserved = donation?.status === 'reserved';
  const isReservedByMe = isReserved && donation?.reservedByNgoId === user?.uid;
  const isPendingMyApproval =
    isReserved && isDonor && isOwner;
  const isCompleted = donation?.status === 'completed';

  // ---------- Loading / Empty states ----------
  if (loading) {
    return (
      <View className="flex-1 bg-secondary-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0d9488" />
        <Text className="text-secondary-500 mt-4 font-medium">Loading donation details...</Text>
      </View>
    );
  }

  if (!donation) {
    return (
      <View className="flex-1 bg-secondary-50 items-center justify-center p-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text className="text-xl font-bold text-secondary-900 mt-4 mb-4">Donation Not Found</Text>
        <TouchableOpacity
          className="bg-primary-600 rounded-xl px-8 py-3"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- Render ----------
  return (
    <View className="flex-1 bg-secondary-50">
      <StatusBar barStyle="light-content" />

      {/* Gradient header bg */}
      <View className="absolute top-0 w-full h-[30%] bg-primary-700 rounded-b-[40px] overflow-hidden z-0">
        <LinearGradient
          colors={['#0f766e', '#14b8a6']}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between z-10">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white tracking-tight">Donation Details</Text>
          <View className="w-10" />
        </View>

        <ScrollView style={{ flex: 1, marginTop: 16 }} showsVerticalScrollIndicator={false}>
          {/* Image */}
          <View className="px-6 mb-6">
            {donation.photos && donation.photos.length > 0 ? (
              <View className="relative shadow-xl rounded-3xl overflow-hidden bg-white">
                <Image
                  source={{ uri: donation.photos[0] }}
                  className="w-full h-64"
                  resizeMode="cover"
                />
                {/* Status badge */}
                <View
                  className={`absolute top-4 right-4 px-3 py-1.5 rounded-full ${isCompleted
                    ? 'bg-green-600'
                    : isReserved
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                    }`}
                >
                  <Text className="text-white text-xs font-bold uppercase">
                    {donation.status || 'available'}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="w-full h-64 bg-white rounded-3xl items-center justify-center shadow-lg">
                <Ionicons name="image-outline" size={64} color="#cbd5e1" />
                <Text className="text-secondary-400 mt-2 font-medium">No Image Available</Text>
                {/* Status badge for no-image case */}
                <View
                  className={`absolute top-4 right-4 px-3 py-1.5 rounded-full ${isCompleted
                    ? 'bg-green-600'
                    : isReserved
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                    }`}
                >
                  <Text className="text-white text-xs font-bold uppercase">
                    {donation.status || 'available'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ---- Status Banners ---- */}

          {/* Donor: pending approval banner */}
          {isPendingMyApproval && (
            <View className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center">
              <Ionicons name="time-outline" size={22} color="#d97706" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text className="font-bold text-amber-800 text-sm">
                  {donation.reservedByNgoName || 'An NGO'} wants your medicine
                </Text>
                <Text className="text-amber-600 text-xs mt-0.5">
                  Review the request and accept or decline below.
                </Text>
              </View>
            </View>
          )}

          {/* NGO: reserved by me banner */}
          {isReservedByMe && (
            <View className="mx-6 mb-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex-row items-center">
              <Ionicons name="hourglass-outline" size={22} color="#2563eb" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text className="font-bold text-blue-800 text-sm">Reserved – Awaiting Donor</Text>
                <Text className="text-blue-600 text-xs mt-0.5">
                  You requested this donation. Waiting for the donor to accept.
                </Text>
              </View>
            </View>
          )}

          {/* Completed banner */}
          {isCompleted && (
            <View className="mx-6 mb-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={22} color="#16a34a" style={{ marginRight: 10 }} />
              <Text className="font-bold text-green-800 text-sm">Donation Completed ✓</Text>
            </View>
          )}

          {/* Main Content Card */}
          <View className="bg-white rounded-t-[40px] px-6 py-8 shadow-lg">
            {/* Title & Expiry */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-secondary-900 mb-2">
                {donation.title || donation.name || 'Medicine Name'}
              </Text>
              <View
                className={`flex-row items-center self-start px-3 py-1.5 rounded-lg ${getDaysUntilExpiry(donation.expiryDate).includes('Expired')
                  ? 'bg-red-50'
                  : 'bg-orange-50'
                  }`}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={
                    getDaysUntilExpiry(donation.expiryDate).includes('Expired')
                      ? '#dc2626'
                      : '#ea580c'
                  }
                  style={{ marginRight: 6 }}
                />
                <Text className={`text-sm font-bold ${getExpiryColor(donation.expiryDate)}`}>
                  {getDaysUntilExpiry(donation.expiryDate)}
                </Text>
                <Text className="text-secondary-400 text-xs ml-2 font-medium">
                  (Exp: {donation.expiryDate?.toDate?.()?.toLocaleDateString() || 'Unknown'})
                </Text>
              </View>
            </View>

            {/* Details Grid */}
            <View className="mb-8">
              <Text className="text-lg font-bold text-secondary-900 mb-4">💊 Medicine Details</Text>
              <View className="flex-row flex-wrap bg-secondary-50 rounded-2xl p-4 border border-secondary-100">
                <View className="w-1/2 mb-4 pr-2">
                  <Text className="text-xs text-secondary-400 font-bold uppercase tracking-wider mb-1">
                    Manufacturer
                  </Text>
                  <Text className="text-sm text-secondary-800 font-semibold">
                    {donation.manufacturer || 'N/A'}
                  </Text>
                </View>
                <View className="w-1/2 mb-4 pl-2">
                  <Text className="text-xs text-secondary-400 font-bold uppercase tracking-wider mb-1">
                    Batch Number
                  </Text>
                  <Text className="text-sm text-secondary-800 font-semibold">
                    {donation.batchNo || 'N/A'}
                  </Text>
                </View>
                <View className="w-1/2 pr-2">
                  <Text className="text-xs text-secondary-400 font-bold uppercase tracking-wider mb-1">
                    Quantity
                  </Text>
                  <Text className="text-sm text-secondary-800 font-semibold">
                    {donation.quantity} units
                  </Text>
                </View>
                <View className="w-1/2 pl-2">
                  <Text className="text-xs text-secondary-400 font-bold uppercase tracking-wider mb-1">
                    Category
                  </Text>
                  <Text className="text-sm text-secondary-800 font-semibold">
                    {donation.category || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            {donation.description && (
              <View className="mb-8">
                <Text className="text-lg font-bold text-secondary-900 mb-2">📝 Description</Text>
                <Text className="text-secondary-600 leading-6 text-base">{donation.description}</Text>
              </View>
            )}

            {/* Donor Info */}
            <View className="mb-8">
              <Text className="text-lg font-bold text-secondary-900 mb-4">👤 Donor Information</Text>
              <View className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <View className="flex-row items-center mb-4">
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={24} color="#2563eb" />
                  </View>
                  <View>
                    <Text className="text-base text-secondary-900 font-bold">
                      {donation.donorName || 'Anonymous Donor'}
                    </Text>
                    {donation.donorType && (
                      <Text className="text-xs text-blue-600 font-bold uppercase tracking-wide mt-0.5">
                        {donation.donorType}
                      </Text>
                    )}
                  </View>
                </View>
                {donation.geo?.address && (
                  <View className="flex-row items-start bg-white/50 p-3 rounded-xl">
                    <Ionicons name="location" size={18} color="#2563eb" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text className="text-sm text-secondary-700 font-medium flex-1 leading-5">
                      {donation.geo.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Safety Info */}
            <View className="bg-orange-50 rounded-2xl p-5 border border-orange-100 mb-24">
              <Text className="text-orange-800 font-bold mb-3">⚠️ Important Safety Information</Text>
              {[
                'Always check the medicine condition before accepting',
                'Verify the expiry date and packaging',
                'Consult a healthcare professional before use',
              ].map((tip, i) => (
                <View key={i} className="flex-row items-start mb-1">
                  <Text className="text-orange-400 mr-2">•</Text>
                  <Text className="text-orange-800 text-sm flex-1">{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* ======== BOTTOM ACTION BAR ======== */}

        {/* NGO: available → Request button */}
        {isNGO && isAvailable && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-secondary-100 px-6 py-4 shadow-lg">
            <View className="flex-row gap-3 mb-3">
              <TouchableOpacity
                className="flex-1 bg-secondary-100 rounded-xl py-3.5 items-center flex-row justify-center"
                onPress={handleContactDonor}
              >
                <Ionicons name="call" size={20} color="#334155" style={{ marginRight: 8 }} />
                <Text className="text-secondary-700 font-bold">Contact</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-secondary-100 rounded-xl py-3.5 items-center flex-row justify-center"
                onPress={handleGetDirections}
              >
                <Ionicons name="navigate" size={20} color="#334155" style={{ marginRight: 8 }} />
                <Text className="text-secondary-700 font-bold">Directions</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className={`rounded-xl py-4 items-center shadow-lg shadow-primary-500/30 ${actionLoading ? 'bg-primary-300' : 'bg-primary-600'
                }`}
              onPress={handleRequestMedicine}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg tracking-wide">Request Medicine</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Donor: reserved → Accept / Decline */}
        {isPendingMyApproval && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-secondary-100 px-6 py-4 shadow-lg">
            <Text className="text-secondary-500 text-xs text-center mb-3 font-medium">
              {donation.reservedByNgoName || 'An NGO'} has requested this donation
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-red-50 border border-red-200 rounded-xl py-4 items-center"
                onPress={handleDecline}
                disabled={actionLoading}
              >
                <Text className="text-red-600 font-bold text-base">Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-4 items-center ${actionLoading ? 'bg-primary-300' : 'bg-primary-600'
                  }`}
                onPress={handleAccept}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">✓ Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* NGO: waiting for approval */}
        {isReservedByMe && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-secondary-100 px-6 py-4 shadow-lg">
            <View className="bg-blue-50 rounded-xl py-4 items-center border border-blue-200">
              <Ionicons name="hourglass-outline" size={20} color="#2563eb" style={{ marginBottom: 4 }} />
              <Text className="text-blue-700 font-bold text-base">Awaiting Donor Approval</Text>
            </View>
          </View>
        )}

        {/* Open chat if already has chatRoomId */}
        {isReserved && donation.chatRoomId && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-secondary-100 px-6 py-4 shadow-lg">
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() =>
                navigation.navigate('ChatScreen', {
                  chatRoomId: donation.chatRoomId,
                  donationId,
                })
              }
            >
              <Ionicons name="chatbubbles-outline" size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">Open Chat</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
