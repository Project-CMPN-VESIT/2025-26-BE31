import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppLogo } from '../../components/common/AppLogo';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

/**
 * DonorHomeScreen
 * Includes a real-time notification banner that surfaces pending NGO reservation requests.
 */
export default function DonorHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);

  // Subscribe to unread notifications for this donor
  useEffect(() => {
    if (!user?.uid) return;
    const notifQ = query(
      collection(db, 'notifications', user.uid, 'items'),
      where('read', '==', false),
    );
    const unsub = onSnapshot(notifQ, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user?.uid]);

  const dismissNotification = async (notifId: string) => {
    if (!user?.uid) return;
    const notifRef = doc(db, 'notifications', user.uid, 'items', notifId);
    await updateDoc(notifRef, { read: true });
  };

  const quickActions = [
    {
      title: 'Upload Medicine',
      description: 'Donate unused medicines',
      icon: 'add-circle',
      onPress: () => navigation.navigate('UploadMedicine'),
      color: 'bg-primary-50',
      iconColor: '#0d9488',
    },
    {
      title: 'My Donations',
      description: 'View donation history',
      icon: 'list',
      onPress: () => navigation.navigate('MyDonations'),
      color: 'bg-blue-50',
      iconColor: '#2563eb',
    },
    {
      title: 'Receiver Requests',
      description: 'See what is needed',
      icon: 'search',
      onPress: () => navigation.navigate('BrowseRequests'),
      color: 'bg-emerald-50',
      iconColor: '#059669',
    },
    {
      title: 'Map View',
      description: 'Find nearby centres',
      icon: 'map',
      onPress: () => navigation.navigate('Map'),
      color: 'bg-purple-50',
      iconColor: '#9333ea',
    },
    {
      title: 'AI Vaidya',
      description: 'Get medical guidance',
      icon: 'chatbubbles',
      onPress: () => navigation.navigate('AIVaidya'),
      color: 'bg-orange-50',
      iconColor: '#ea580c',
    },
  ];

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header BG */}
      <View className="absolute top-0 w-full h-[30%] bg-primary-700 rounded-b-[40px] overflow-hidden">
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
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="px-6 pt-6 pb-8">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-primary-100 text-base font-medium mb-1">Welcome Back,</Text>
                <Text className="text-white text-2xl font-bold tracking-tight">
                  {user?.name || 'Donor'} 👋
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <AppLogo size={40} />
                {/* Notification bell with badge */}
                <TouchableOpacity
                  className="w-10 h-10 bg-white/20 rounded-full items-center justify-center relative"
                  onPress={() => navigation.navigate('MyDonations')}
                >
                  <Ionicons name="notifications-outline" size={20} color="white" />
                  {notifications.length > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: '#ef4444',
                        borderRadius: 8,
                        minWidth: 16,
                        height: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>
                        {notifications.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row justify-between mt-2">
              <View className="flex-1 bg-white/10 p-4 rounded-2xl mr-2 border border-white/20">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center mr-2">
                    <Ionicons name="gift-outline" size={16} color="white" />
                  </View>
                  <Text className="text-primary-50 text-xs font-medium">Donations</Text>
                </View>
                <Text className="text-white text-2xl font-bold">0</Text>
              </View>
              <View className="flex-1 bg-white/10 p-4 rounded-2xl ml-2 border border-white/20">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center mr-2">
                    <Ionicons name="heart-outline" size={16} color="white" />
                  </View>
                  <Text className="text-primary-50 text-xs font-medium">Lives Impacted</Text>
                </View>
                <Text className="text-white text-2xl font-bold">0</Text>
              </View>
            </View>
          </View>

          <View className="px-6 pb-24">
            {/* ---- Notification Banner ---- */}
            {notifications.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-bold text-secondary-900 mb-3">
                  🔔 Pending Requests
                </Text>
                {notifications.map((notif) => (
                  <View
                    key={notif.id}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3"
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-3">
                        <Text className="font-bold text-amber-900 text-sm mb-1">
                          {notif.ngoName || 'An NGO'} wants your medicine
                        </Text>
                        <Text className="text-amber-700 text-xs leading-4">
                          {notif.donationTitle || 'Medicine'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => dismissNotification(notif.id)}>
                        <Ionicons name="close-circle" size={20} color="#d97706" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      className="bg-amber-600 rounded-xl py-2.5 flex-row items-center justify-center"
                      onPress={() => {
                        dismissNotification(notif.id);
                        navigation.navigate('DonationDetails', { donationId: notif.donationId });
                      }}
                    >
                      <Ionicons name="eye-outline" size={15} color="white" style={{ marginRight: 6 }} />
                      <Text className="text-white font-bold text-sm">Review Request</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Quick Actions */}
            <Text className="text-lg font-bold text-secondary-900 mb-4">Quick Actions</Text>
            <View className="flex-row flex-wrap justify-between mb-8">
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm border border-secondary-100"
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <View className={`${action.color} w-12 h-12 rounded-xl items-center justify-center mb-3`}>
                    <Ionicons name={action.icon as any} size={24} color={action.iconColor} />
                  </View>
                  <Text className="text-base font-bold text-secondary-900 mb-1">{action.title}</Text>
                  <Text className="text-xs text-secondary-500 font-medium leading-4">
                    {action.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Activity placeholder */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-secondary-900">Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyDonations')}>
                <Text className="text-primary-600 font-semibold text-sm">See All</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-white rounded-2xl p-8 shadow-sm border border-secondary-100 items-center justify-center min-h-[130px]">
              <Ionicons name="time-outline" size={32} color="#94a3b8" />
              <Text className="text-secondary-500 font-medium text-center mt-3 mb-1">
                No recent activity
              </Text>
              <Text className="text-secondary-400 text-xs text-center max-w-[200px]">
                Your recent donations and updates will appear here
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
