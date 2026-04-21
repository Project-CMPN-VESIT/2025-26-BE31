import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { sendMessage, subscribeToMessages, subscribeToChatRoom } from '../../services/chat';
import { verifyHandoverOTP } from '../../services/handover';
import Toast from 'react-native-toast-message';

/**
 * ChatScreen
 * Redesigned: shows a sticky OTP banner at the top.
 *   - Donor: sees the 6-digit OTP (to tell the NGO verbally/physically)
 *   - NGO: has an OTP input + "Verify Handover" button
 * On successful verification, donor auto-navigates to ImpactCertificateScreen.
 */
export default function ChatScreen() {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { chatRoomId, donationId } =
        route.params as { chatRoomId: string; donationId: string };

    const [messages, setMessages] = useState<any[]>([]);
    const [chatRoom, setChatRoom] = useState<any>(null);
    const [inputText, setInputText] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Subscribe to messages
    useEffect(() => {
        if (!chatRoomId) return;
        const unsub = subscribeToMessages(chatRoomId, (msgs) => {
            setMessages(msgs);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });
        return () => unsub();
    }, [chatRoomId]);

    // Subscribe to chat room doc (OTP / status)
    useEffect(() => {
        if (!chatRoomId) return;
        const unsub = subscribeToChatRoom(chatRoomId, (data) => {
            setChatRoom(data);
        });
        return () => unsub();
    }, [chatRoomId]);

    // Watch for OTP verification – donor navigates to certificate
    useEffect(() => {
        if (chatRoom?.otpVerified && user?.uid === chatRoom?.donorId) {
            // Show celebration briefly then navigate
            setShowCelebration(true);
            setTimeout(() => {
                setShowCelebration(false);
                navigation.navigate('ImpactCertificate', {
                    donorName: user?.name || 'Donor',
                    medicineName: chatRoom?.donationTitle || 'Medicine',
                    ngoName: chatRoom?.receiverName || 'NGO',
                    quantity: chatRoom?.donationQuantity || 1,
                    completedAt: new Date().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    }),
                });
            }, 2000);
        }
    }, [chatRoom?.otpVerified]);

    const isDonor = user?.uid === chatRoom?.donorId;
    const isNGO = user?.uid === chatRoom?.receiverId;
    const otp: string = chatRoom?.handoverOtp || '';
    const isOtpVerified: boolean = chatRoom?.otpVerified || false;

    // -------- Actions --------
    const handleSend = async () => {
        if (!inputText.trim() || !user?.uid) return;
        const textToSend = inputText;
        setInputText('');
        try {
            await sendMessage(chatRoomId, user.uid, textToSend);
        } catch {
            setInputText(textToSend);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otpInput.trim() || otpInput.trim().length !== 6) {
            Toast.show({ type: 'error', text1: 'Enter a valid 6-digit OTP' });
            return;
        }
        setVerifying(true);
        try {
            await verifyHandoverOTP(chatRoomId, otpInput.trim(), donationId);
            Toast.show({ type: 'success', text1: '✓ Handover Verified!', text2: 'Donation marked as completed.' });
            setOtpInput('');
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Invalid OTP', text2: e.message });
        } finally {
            setVerifying(false);
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMine = item.senderId === user?.uid;
        return (
            <View
                style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    backgroundColor: isMine ? '#0d9488' : '#f1f5f9',
                    borderRadius: 18,
                    borderBottomRightRadius: isMine ? 4 : 18,
                    borderBottomLeftRadius: isMine ? 18 : 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    marginHorizontal: 16,
                    marginVertical: 4,
                    maxWidth: '80%',
                }}
            >
                <Text style={{ color: isMine ? 'white' : '#1e293b', fontSize: 15 }}>{item.text}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Celebration Modal */}
            <Modal visible={showCelebration} transparent animationType="fade">
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 28,
                            padding: 36,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ fontSize: 64 }}>🎉</Text>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f766e', marginTop: 16 }}>
                            Handover Complete!
                        </Text>
                        <Text style={{ color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                            Generating your Impact Certificate…
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f1f5f9',
                    backgroundColor: 'white',
                }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginRight: 12, padding: 6 }}
                >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#0f172a' }}>
                        {isDonor ? chatRoom?.receiverName || 'NGO' : chatRoom?.donorName || 'Donor'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Handover Chat</Text>
                </View>
                <View
                    style={{
                        backgroundColor: isOtpVerified ? '#dcfce7' : '#fff7ed',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isOtpVerified ? '#16a34a' : '#92400e',
                        }}
                    >
                        {isOtpVerified ? '✓ Completed' : '⏳ Pending'}
                    </Text>
                </View>
            </View>

            {/* OTP Banner */}
            {!isOtpVerified && (
                <View>
                    {/* Donor sees OTP */}
                    {isDonor && otp ? (
                        <View
                            style={{
                                margin: 12,
                                backgroundColor: '#f0fdf4',
                                borderRadius: 18,
                                padding: 18,
                                borderWidth: 1.5,
                                borderColor: '#86efac',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d', letterSpacing: 1, marginBottom: 4 }}>
                                YOUR HANDOVER OTP
                            </Text>
                            <Text style={{ fontSize: 40, fontWeight: '800', color: '#065f46', letterSpacing: 8 }}>
                                {otp}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#16a34a', marginTop: 6 }}>
                                Share this code with the NGO during handover
                            </Text>
                        </View>
                    ) : null}

                    {/* NGO enters OTP */}
                    {isNGO ? (
                        <View
                            style={{
                                margin: 12,
                                backgroundColor: '#eff6ff',
                                borderRadius: 18,
                                padding: 18,
                                borderWidth: 1.5,
                                borderColor: '#93c5fd',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    fontWeight: '700',
                                    color: '#1d4ed8',
                                    letterSpacing: 1,
                                    marginBottom: 10,
                                    textAlign: 'center',
                                }}
                            >
                                ENTER HANDOVER OTP
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: '#bfdbfe',
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    fontSize: 28,
                                    fontWeight: '800',
                                    letterSpacing: 6,
                                    textAlign: 'center',
                                    color: '#1e3a5f',
                                    marginBottom: 12,
                                }}
                                placeholder="000000"
                                placeholderTextColor="#94a3b8"
                                value={otpInput}
                                onChangeText={setOtpInput}
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                            <TouchableOpacity
                                onPress={handleVerifyOTP}
                                disabled={verifying}
                                style={{
                                    backgroundColor: verifying ? '#93c5fd' : '#2563eb',
                                    borderRadius: 14,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                }}
                            >
                                {verifying ? (
                                    <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                                ) : (
                                    <Ionicons name="shield-checkmark-outline" size={18} color="white" style={{ marginRight: 8 }} />
                                )}
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                                    {verifying ? 'Verifying…' : 'Verify Handover'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>
            )}

            {/* Verified banner */}
            {isOtpVerified && (
                <View
                    style={{
                        margin: 12,
                        backgroundColor: '#f0fdf4',
                        borderRadius: 14,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#86efac',
                    }}
                >
                    <Ionicons name="checkmark-circle" size={22} color="#16a34a" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 14 }}>
                        Handover Verified! Donation Completed ✓
                    </Text>
                </View>
            )}

            {/* Chat messages */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingTop: 32 }}>
                            <Ionicons name="chatbubbles-outline" size={40} color="#cbd5e1" />
                            <Text style={{ color: '#94a3b8', marginTop: 8, fontSize: 14 }}>
                                No messages yet. Say hi!
                            </Text>
                        </View>
                    }
                />

                {/* Input */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9',
                        backgroundColor: 'white',
                    }}
                >
                    <TextInput
                        style={{
                            flex: 1,
                            backgroundColor: '#f8fafc',
                            borderRadius: 24,
                            paddingHorizontal: 18,
                            paddingVertical: 12,
                            fontSize: 15,
                            marginRight: 10,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                        }}
                        placeholder="Type a message…"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 23,
                            backgroundColor: inputText.trim() ? '#0d9488' : '#e2e8f0',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
