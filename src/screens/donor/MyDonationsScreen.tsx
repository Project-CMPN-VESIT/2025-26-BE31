import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { acceptReservation, declineReservation } from '../../services/handover';

/**
 * MyDonationsScreen
 * Donor's live donation list with full status support:
 *   - available (green)
 *   - reserved  (amber) → Accept / Decline row
 *   - completed (teal)  → View Certificate button
 *   - cancelled (red)
 */
export default function MyDonationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Real-time listener
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'donations'),
      where('donorId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setDonations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const handleAccept = useCallback(
    async (item: any) => {
      setActionLoading(item.id);
      try {
        const chatRoomId = await acceptReservation(
          item.id,
          user!.uid || '',
          item.reservedByNgoId,
          item.reservedByNgoName || 'NGO',
          user!.name || '',
        );
        navigation.navigate('ChatScreen', { chatRoomId, donationId: item.id });
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally {
        setActionLoading(null);
      }
    },
    [user, navigation],
  );

  const handleDecline = useCallback(
    async (item: any) => {
      setActionLoading(item.id);
      try {
        await declineReservation(item.id);
        Toast.show({ type: 'info', text1: 'Reservation declined' });
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const handleViewCertificate = useCallback(
    (item: any) => {
      const completedDate = item.completedAt?.toDate?.()
        ? item.completedAt.toDate().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        : new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

      navigation.navigate('ImpactCertificate', {
        donorName: user?.name || 'Donor',
        medicineName: item.title || item.name || 'Medicine',
        ngoName: item.reservedByNgoName || 'NGO',
        quantity: item.quantity || 1,
        completedAt: completedDate,
      });
    },
    [user, navigation],
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Available' };
      case 'reserved':
        return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: '⏳ Reserved' };
      case 'completed':
        return { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', label: '✓ Completed' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: status };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const badge = getStatusBadge(item.status);
    const isReserved = item.status === 'reserved';
    const isCompleted = item.status === 'completed';
    const isLoadingThis = actionLoading === item.id;

    return (
      <TouchableOpacity
        className="bg-white rounded-2xl p-5 mb-4 mx-6 shadow-sm border border-secondary-100"
        onPress={() => navigation.navigate('DonationDetails', { donationId: item.id })}
        activeOpacity={0.7}
      >
        {/* Title + Badge */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-lg font-bold text-secondary-900 mb-1" numberOfLines={1}>
              {item.title || item.name || 'Medicine'}
            </Text>
            <Text className="text-sm text-secondary-500 font-medium">
              {item.quantity} unit{item.quantity !== 1 ? 's' : ''}
            </Text>
          </View>
          <View className={`px-3 py-1.5 rounded-full border ${badge.bg} ${badge.border}`}>
            <Text className={`text-xs font-bold tracking-wide ${badge.text}`}>{badge.label}</Text>
          </View>
        </View>

        <View className="h-[1px] bg-secondary-100 mb-3" />

        {/* Meta row */}
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <View className="w-7 h-7 bg-secondary-50 rounded-full items-center justify-center mr-2">
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
            </View>
            <Text className="text-xs text-secondary-600 font-semibold">
              {item.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </Text>
          </View>
          {item.category && (
            <View className="bg-primary-50 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-primary-600 font-semibold">{item.category}</Text>
            </View>
          )}
        </View>

        {/* Reserved → NGO name + Accept / Decline */}
        {isReserved && item.reservedByNgoName && (
          <View className="mt-2">
            <View className="bg-amber-50 rounded-xl p-3 mb-2 flex-row items-center">
              <Ionicons name="business-outline" size={16} color="#d97706" style={{ marginRight: 8 }} />
              <Text className="text-amber-800 text-sm font-semibold flex-1" numberOfLines={1}>
                {item.reservedByNgoName} wants this
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 bg-red-50 border border-red-200 rounded-xl py-3 items-center"
                onPress={() => handleDecline(item)}
                disabled={isLoadingThis}
              >
                <Text className="text-red-600 font-bold text-sm">Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-3 items-center ${isLoadingThis ? 'bg-primary-300' : 'bg-primary-600'
                  }`}
                onPress={() => handleAccept(item)}
                disabled={isLoadingThis}
              >
                {isLoadingThis ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-sm">✓ Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Completed → open chat or view certificate */}
        {isCompleted && (
          <View className="mt-2 flex-row gap-2">
            {item.chatRoomId && (
              <TouchableOpacity
                className="flex-1 bg-secondary-100 rounded-xl py-3 items-center flex-row justify-center"
                onPress={() =>
                  navigation.navigate('ChatScreen', {
                    chatRoomId: item.chatRoomId,
                    donationId: item.id,
                  })
                }
              >
                <Ionicons name="chatbubbles-outline" size={15} color="#334155" style={{ marginRight: 6 }} />
                <Text className="text-secondary-700 font-bold text-sm">Chat</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 bg-primary-600 rounded-xl py-3 items-center flex-row justify-center"
              onPress={() => handleViewCertificate(item)}
            >
              <Ionicons name="ribbon-outline" size={15} color="white" style={{ marginRight: 6 }} />
              <Text className="text-white font-bold text-sm">Certificate</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header BG */}
      <View className="absolute top-0 w-full h-[25%] bg-primary-700 rounded-b-[40px] overflow-hidden">
        <LinearGradient
          colors={['#0f766e', '#14b8a6']}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <View className="absolute top-20 -left-10 w-20 h-20 bg-white/10 rounded-full" />
      </View>

      <View className="flex-1" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white tracking-tight">My Donations</Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0d9488" />
            <Text className="text-secondary-500 mt-4 font-medium">Loading donations…</Text>
          </View>
        ) : (
          <FlatList
            data={donations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0d9488" />
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-20 px-6">
                <Text className="text-5xl mb-4">📦</Text>
                <Text className="text-xl font-bold text-secondary-900 mb-2 text-center">
                  No Donations Yet
                </Text>
                <Text className="text-secondary-500 text-center leading-6">
                  You haven't made any donations yet.{'\n'}Start by uploading your first medicine donation!
                </Text>
                <TouchableOpacity
                  className="mt-8 bg-primary-600 px-8 py-3 rounded-xl shadow-lg shadow-primary-500/30"
                  onPress={() => navigation.navigate('UploadMedicine')}
                >
                  <Text className="text-white font-bold text-base">Donate Now</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}
