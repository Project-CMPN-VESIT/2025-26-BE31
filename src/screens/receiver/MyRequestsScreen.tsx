import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * MyRequestsScreen Component
 * Shows receiver's medicine requests
 */
export default function MyRequestsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    try {
      const requestsRef = collection(db, 'requests');
      const q = query(
        requestsRef,
        where('ngoId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requestsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRequests(requestsList);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      Toast.show({
        type: 'error',
        text1: 'Error Loading Requests',
        text2: 'Please try again',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'matched':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'fulfilled':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-100';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-100';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const renderRequestItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-5 mb-4 mx-6 shadow-sm border border-secondary-100"
      onPress={() => {
        navigation.navigate('RequestDetails', { requestId: item.id });
      }}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-4">
          <Text className="text-lg font-bold text-secondary-900 mb-1" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-sm text-secondary-500 font-medium">
            Quantity: {item.quantityNeeded} units
          </Text>
        </View>
        <View className={`px-3 py-1.5 rounded-full border ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-bold capitalize tracking-wide">
            {item.status || 'open'}
          </Text>
        </View>
      </View>

      <View className="bg-secondary-50 rounded-xl p-3 mb-4">
        <Text className="text-xs text-secondary-400 font-bold uppercase tracking-wider mb-1">Reason</Text>
        <Text className="text-sm text-secondary-700 leading-5" numberOfLines={2}>
          {item.reason}
        </Text>
      </View>

      <View className="h-[1px] bg-secondary-100 mb-4" />

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className={`px-2 py-1 rounded-lg border mr-2 ${getUrgencyColor(item.urgency)}`}>
            <Text className={`text-[10px] font-bold uppercase ${getUrgencyColor(item.urgency).split(' ')[0]}`}>
              {item.urgency} Priority
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={14} color="#94a3b8" style={{ marginRight: 4 }} />
          <Text className="text-xs text-secondary-500 font-medium">
            {item.createdAt?.toDate().toLocaleDateString() || 'N/A'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-secondary-50">
      <StatusBar barStyle="light-content" />

      {/* Header Background */}
      <View className="absolute top-0 w-full h-[25%] bg-blue-600 rounded-b-[40px] overflow-hidden">
        <LinearGradient
          colors={['#2563eb', '#3b82f6']}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <View className="absolute top-20 -left-10 w-20 h-20 bg-white/10 rounded-full" />
      </View>

      <SafeAreaView className="flex-1">
        {/* Header Content */}
        <View className="px-6 pt-4 pb-2 flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-md mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white tracking-tight">
            My Requests
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-secondary-500 mt-4 font-medium">Loading requests...</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 16, paddingBottom: 100 }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-20 px-6">
                <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-sm">
                  <Text className="text-5xl">📝</Text>
                </View>
                <Text className="text-xl font-bold text-secondary-900 mb-2 text-center">
                  No Requests Yet
                </Text>
                <Text className="text-secondary-500 text-center leading-6">
                  You haven't made any requests yet.{"\n"}Submit a request to find medicine donations!
                </Text>
                <TouchableOpacity
                  className="mt-8 bg-blue-600 px-8 py-3 rounded-xl shadow-lg shadow-blue-500/30"
                  onPress={() => navigation.navigate('RequestMedicine')}
                >
                  <Text className="text-white font-bold text-base">Create Request</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
