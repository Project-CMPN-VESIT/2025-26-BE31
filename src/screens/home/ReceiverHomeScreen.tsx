import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
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
  getDocs,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function ReceiverHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const q = query(
          collection(db, 'donations'),
          where('status', '==', 'available'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDonations(data);
      } catch (error) {
        console.log('Error fetching donations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  const quickActions = [
    {
      title: 'Request Medicine',
      description: 'Submit a new request',
      icon: 'add-circle',
      onPress: () => navigation.navigate('RequestMedicine'),
      color: 'bg-primary-50',
      iconColor: '#0d9488',
    },
    {
      title: 'Available Donations',
      description: 'Browse medicines',
      icon: 'search',
      onPress: () => navigation.navigate('AvailableDonations'),
      color: 'bg-emerald-50',
      iconColor: '#059669',
    },
    {
      title: 'Map View',
      description: 'Find nearby donors',
      icon: 'map',
      onPress: () => navigation.navigate('Map'),
      color: 'bg-indigo-50',
      iconColor: '#4f46e5',
    },
    {
      title: 'My Requests',
      description: 'Track your requests',
      icon: 'list',
      onPress: () => navigation.navigate('MyRequests'),
      color: 'bg-orange-50',
      iconColor: '#ea580c',
    },
    {
      title: 'AI Vaidya',
      description: 'Get medical help',
      icon: 'chatbubbles',
      onPress: () => navigation.navigate('AIVaidya'),
      color: 'bg-teal-100',
      iconColor: '#0d9488',
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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="px-6 pt-6 pb-8">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-primary-100 text-base mb-1">
                  Welcome Back,
                </Text>
                <Text className="text-white text-2xl font-bold">
                  {user?.name || 'Receiver'} 👋
                </Text>
              </View>

              <View className="flex-row items-center gap-3">
                <AppLogo size={40} />
                <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                  <Ionicons name="notifications-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row justify-between">
              <View className="flex-1 bg-white/10 p-4 rounded-2xl mr-2 border border-white/20">
                <Text className="text-primary-50 text-xs mb-1">
                  Active Requests
                </Text>
                <Text className="text-white text-2xl font-bold">0</Text>
              </View>

              <View className="flex-1 bg-white/10 p-4 rounded-2xl ml-2 border border-white/20">
                <Text className="text-primary-50 text-xs mb-1">
                  Fulfilled
                </Text>
                <Text className="text-white text-2xl font-bold">0</Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View className="px-6 pb-24">
            {/* Quick Actions */}
            <Text className="text-lg font-bold text-secondary-900 mb-4">
              Quick Actions
            </Text>

            <View className="flex-row flex-wrap justify-between mb-8">
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  className="w-[48%] bg-white rounded-2xl p-4 mb-4 border border-secondary-100"
                  onPress={action.onPress}
                >
                  <View
                    className={`${action.color} w-12 h-12 rounded-xl items-center justify-center mb-3`}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={24}
                      color={action.iconColor}
                    />
                  </View>

                  <Text className="text-base font-bold text-secondary-900">
                    {action.title}
                  </Text>
                  <Text className="text-xs text-secondary-500">
                    {action.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nearby Donations */}
            <Text className="text-lg font-bold text-secondary-900 mb-4">
              Nearby Donations
            </Text>

            {loading ? (
              <ActivityIndicator color="#0d9488" />
            ) : donations.length > 0 ? (
              donations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="bg-white rounded-2xl p-4 mb-3 border border-secondary-100 flex-row items-center"
                  onPress={() =>
                    navigation.navigate('DonationDetails', {
                      donationId: item.id,
                    })
                  }
                >
                  <View className="w-14 h-14 bg-primary-50 rounded-xl items-center justify-center mr-4">
                    {item.photos?.[0] ? (
                      <Image
                        source={{ uri: item.photos[0] }}
                        className="w-14 h-14 rounded-xl"
                      />
                    ) : (
                      <Ionicons name="medkit-outline" size={24} color="#0d9488" />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="font-bold text-secondary-900">
                      {item.title || 'Medicine'}
                    </Text>
                    <Text className="text-xs text-secondary-500">
                      {item.quantity} units
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-center text-secondary-400">
                No donations available
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}