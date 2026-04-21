import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { getRequest, updateRequest, deleteRequest } from '../../services/request';
import { createMatch } from '../../services/matching';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * RequestDetailsScreen Component
 * Shows detailed information about a specific medicine request
 */
export default function RequestDetailsScreen({ route, navigation }: any) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const data = await getRequest(requestId);
      if (data) {
        setRequest(data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Request Not Found',
          text2: 'This request may have been removed',
        });
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading request:', error);
      Toast.show({
        type: 'error',
        text1: 'Error Loading Details',
        text2: 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await updateRequest(requestId, { status: 'cancelled' });
              Toast.show({
                type: 'success',
                text1: 'Request Cancelled',
                text2: 'Your request has been cancelled',
              });
              navigation.goBack();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to cancel request',
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteRequest = () => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to permanently delete this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteRequest(requestId);
              Toast.show({
                type: 'success',
                text1: 'Request Deleted',
                text2: 'Your request has been deleted',
              });
              navigation.goBack();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete request',
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'matched':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'fulfilled':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
      default:
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-100';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-100';
      default:
        return 'text-secondary-600 bg-secondary-50 border-secondary-100';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-secondary-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0d9488" />
        <Text className="text-secondary-500 mt-4 font-medium">Loading request details...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View className="flex-1 bg-secondary-50 items-center justify-center p-6">
        <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-6">
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        </View>
        <Text className="text-xl font-bold text-secondary-900 mb-2">
          Request Not Found
        </Text>
        <TouchableOpacity
          className="bg-primary-600 rounded-xl px-8 py-3 mt-4 shadow-lg shadow-primary-500/30"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.uid === request.ngoId;

  return (
    <View className="flex-1 bg-secondary-50">
      <StatusBar barStyle="light-content" />

      {/* Header Background */}
      <View className="absolute top-0 w-full h-[30%] bg-primary-700 rounded-b-[40px] overflow-hidden z-0">
        <LinearGradient
          colors={['#0f766e', '#14b8a6']}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <View className="absolute top-20 -left-10 w-20 h-20 bg-white/10 rounded-full" />
      </View>

      <SafeAreaView className="flex-1">
        {/* Header Content */}
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between z-10">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white tracking-tight">
            Request Details
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView style={{ flex: 1, marginTop: 16 }} showsVerticalScrollIndicator={false}>
          {/* Main Content */}
          <View className="px-6 pb-24">
            {/* Status Card */}
            <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-secondary-100">
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 mr-4">
                  <Text className="text-2xl font-bold text-secondary-900 mb-1">
                    {request.title}
                  </Text>
                  <Text className="text-secondary-500 font-medium">
                    Requested on {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </Text>
                </View>
                <View className={`px-3 py-1.5 rounded-full border ${getStatusColor(request.status)}`}>
                  <Text className={`text-xs font-bold uppercase tracking-wide ${getStatusColor(request.status).split(' ')[1]}`}>
                    {request.status}
                  </Text>
                </View>
              </View>

              <View className="h-[1px] bg-secondary-100 my-4" />

              <View className="flex-row flex-wrap">
                <View className="w-1/2 mb-4 pr-2">
                  <Text className="text-xs text-secondary-400 font-bold uppercase tracking-wider mb-1">Quantity Needed</Text>
                  <Text className="text-xl text-secondary-900 font-bold">
                    {request.quantityNeeded} <Text className="text-sm font-medium text-secondary-500">units</Text>
                  </Text>
                </View>
                <View className="w-1/2 mb-4 pl-2">
                  <Text className="text-xs text-secondary-400 font-bold uppercase tracking-wider mb-1">Urgency</Text>
                  <View className={`self-start px-2 py-1 rounded-lg border ${getUrgencyColor(request.urgency)}`}>
                    <Text className={`text-sm font-bold uppercase ${getUrgencyColor(request.urgency).split(' ')[0]}`}>
                      {request.urgency}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Reason */}
            <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-secondary-100">
              <Text className="text-lg font-bold text-secondary-900 mb-4 flex-row items-center">
                📝 Reason for Request
              </Text>
              <View className="bg-secondary-50 rounded-2xl p-4 border border-secondary-100">
                <Text className="text-secondary-700 leading-6 text-base">
                  {request.reason}
                </Text>
              </View>
            </View>

            {/* Location */}
            {request.geo?.address && (
              <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-secondary-100">
                <Text className="text-lg font-bold text-secondary-900 mb-4 flex-row items-center">
                  📍 Delivery Location
                </Text>
                <View className="flex-row items-start bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <Ionicons name="location" size={20} color="#2563eb" style={{ marginRight: 10, marginTop: 2 }} />
                  <Text className="text-secondary-800 font-medium flex-1 leading-5">
                    {request.geo.address}
                  </Text>
                </View>
              </View>
            )}

            {/* Matched Donation (if available) */}
            {request.status === 'matched' && request.matchedDonationId && (
              <View className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 mb-6">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  </View>
                  <Text className="text-emerald-900 font-bold text-lg">
                    Match Found!
                  </Text>
                </View>
                <Text className="text-emerald-800 text-base leading-6">
                  A donor has been matched with your request. You will be contacted soon regarding the donation.
                </Text>
              </View>
            )}

            {/* Status Information */}
            <View className="bg-blue-50 rounded-3xl p-6 border border-blue-100 mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="information-circle" size={24} color="#2563eb" style={{ marginRight: 10 }} />
                <Text className="text-blue-900 font-bold text-lg">
                  Status Information
                </Text>
              </View>
              <Text className="text-blue-800 text-sm leading-6 font-medium">
                {request.status === 'open' && 'Your request is active and visible to donors nearby. We will notify you when a match is found.'}
                {request.status === 'matched' && 'A donor has been matched! They will contact you shortly to arrange the donation.'}
                {request.status === 'fulfilled' && 'Your request has been successfully fulfilled. Thank you for using NiyatKalpa!'}
                {request.status === 'cancelled' && 'This request has been cancelled and is no longer visible to donors.'}
              </Text>
            </View>

            {/* Request Info */}
            <View className="items-center">
              <Text className="text-secondary-400 text-sm font-medium">
                Requested by {request.ngoName}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons (only for owner) */}
        {isOwner && request.status === 'open' && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-secondary-100 px-6 py-4 shadow-lg">
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-secondary-100 rounded-xl py-4 items-center flex-row justify-center"
                onPress={handleDeleteRequest}
                disabled={actionLoading}
              >
                <Ionicons name="trash-outline" size={20} color="#334155" style={{ marginRight: 8 }} />
                <Text className="text-secondary-700 font-bold">Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-50 border border-red-100 rounded-xl py-4 items-center flex-row justify-center"
                onPress={handleCancelRequest}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
                    <Text className="text-red-600 font-bold">Cancel Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* View Only Message for Non-owners */}
        {!isOwner && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-secondary-100 px-6 py-4">
            {user?.role === 'donor' && request.status === 'open' ? (
              <TouchableOpacity
                className="bg-primary-600 rounded-xl py-4 items-center flex-row justify-center shadow-lg shadow-primary-500/30"
                onPress={() => {
                  // Simply open chat with NGO for now
                  navigation.navigate('ChatScreen', {
                    otherUserId: request.ngoId,
                    otherUserName: request.ngoName || 'NGO'
                  });
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-lg">Contact Receiver</Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-secondary-500 text-center text-sm font-medium">
                You are viewing this request as {user?.role}
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
