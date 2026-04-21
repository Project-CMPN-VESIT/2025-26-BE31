import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Share,
    SafeAreaView,
    ScrollView,
    StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * ImpactCertificateScreen
 * Shown to donor after successful OTP handover verification.
 */
export default function ImpactCertificateScreen() {
    const route = useRoute();
    const navigation = useNavigation<any>();

    const { donorName, medicineName, ngoName, quantity, completedAt } =
        route.params as {
            donorName: string;
            medicineName: string;
            ngoName: string;
            quantity: number;
            completedAt: string;
        };

    const handleShare = async () => {
        try {
            await Share.share({
                message:
                    `🏅 Certificate of Impact – NiyatKalpa\n\n` +
                    `This certifies that ${donorName} donated ${quantity} unit(s) of ${medicineName} to ${ngoName} on ${completedAt}.\n\n` +
                    `"Every act of kindness plants a seed of hope."\n\n` +
                    `— Powered by NiyatKalpa`,
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleDone = () => {
        // Navigate back to home
        navigation.navigate('HomeScreen');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0f766e' }}>
            <StatusBar barStyle="light-content" backgroundColor="#0f766e" />

            {/* Gradient backdrop */}
            <LinearGradient
                colors={['#0f766e', '#0d9488', '#14b8a6']}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative circles */}
            <View
                style={{
                    position: 'absolute',
                    top: -60,
                    right: -60,
                    width: 200,
                    height: 200,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 100,
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    bottom: 100,
                    left: -80,
                    width: 240,
                    height: 240,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 120,
                }}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Top close button */}
                    <View style={{ alignItems: 'flex-end', paddingTop: 16, marginBottom: 8 }}>
                        <TouchableOpacity
                            onPress={handleDone}
                            style={{
                                width: 40,
                                height: 40,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="close" size={22} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Certificate Card */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 28,
                            padding: 28,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 12 },
                            shadowOpacity: 0.25,
                            shadowRadius: 24,
                            elevation: 16,
                        }}
                    >
                        {/* Seal / Badge */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: '#f0fdf4',
                                    borderWidth: 3,
                                    borderColor: '#10b981',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontSize: 36 }}>🏅</Text>
                            </View>

                            {/* Brand */}
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: '#0d9488',
                                    letterSpacing: 3,
                                    textTransform: 'uppercase',
                                    marginBottom: 4,
                                }}
                            >
                                NiyatKalpa
                            </Text>

                            {/* Title */}
                            <Text
                                style={{
                                    fontSize: 22,
                                    fontWeight: '800',
                                    color: '#0f172a',
                                    textAlign: 'center',
                                    marginBottom: 6,
                                }}
                            >
                                Certificate of Impact
                            </Text>

                            {/* Decorative divider */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
                                <Text style={{ marginHorizontal: 8, color: '#10b981', fontSize: 14 }}>✦</Text>
                                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
                            </View>

                            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
                                This is to certify that
                            </Text>
                        </View>

                        {/* Donor Name */}
                        <View
                            style={{
                                backgroundColor: '#f0fdf4',
                                borderRadius: 14,
                                paddingVertical: 14,
                                paddingHorizontal: 20,
                                borderWidth: 1,
                                borderColor: '#bbf7d0',
                                marginBottom: 24,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#064e3b' }}>
                                {donorName}
                            </Text>
                        </View>

                        {/* Details rows */}
                        {[
                            { icon: '💊', label: 'Medicine', value: medicineName },
                            { icon: '📦', label: 'Quantity', value: `${quantity} unit(s)` },
                            { icon: '🏥', label: 'Received by', value: ngoName },
                            { icon: '📅', label: 'Date', value: completedAt },
                        ].map((item, idx) => (
                            <View
                                key={idx}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                    borderBottomWidth: idx < 3 ? 1 : 0,
                                    borderBottomColor: '#f1f5f9',
                                }}
                            >
                                <Text style={{ fontSize: 20, marginRight: 12 }}>{item.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                        {item.label}
                                    </Text>
                                    <Text style={{ fontSize: 15, color: '#1e293b', fontWeight: '700', marginTop: 2 }}>
                                        {item.value}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        {/* Motivational Quote */}
                        <View
                            style={{
                                backgroundColor: '#fffbeb',
                                borderRadius: 14,
                                padding: 16,
                                marginTop: 20,
                                borderLeftWidth: 4,
                                borderLeftColor: '#f59e0b',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: '#78350f',
                                    fontStyle: 'italic',
                                    lineHeight: 20,
                                    textAlign: 'center',
                                }}
                            >
                                "Every act of kindness plants a seed of hope.{'\n'}Your generosity heals lives."
                            </Text>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: '#b45309',
                                    fontWeight: '700',
                                    textAlign: 'center',
                                    marginTop: 8,
                                    letterSpacing: 1,
                                }}
                            >
                                — NiyatKalpa Foundation
                            </Text>
                        </View>

                        {/* Verification mark */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                            <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '600', marginLeft: 6 }}>
                                Verified Handover
                            </Text>
                        </View>
                    </View>

                    {/* Action buttons */}
                    <View style={{ marginTop: 28, gap: 12 }}>
                        <TouchableOpacity
                            onPress={handleShare}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 18,
                                paddingVertical: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 8,
                                elevation: 5,
                            }}
                        >
                            <Ionicons name="share-social" size={22} color="#0d9488" style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0d9488' }}>
                                Share Certificate
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleDone}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 18,
                                paddingVertical: 16,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.3)',
                            }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>
                                Done
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
