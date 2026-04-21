import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { db, storage } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { getCurrentLocation, LocationCoords } from "../../services/location";
import { extractMedicineDetails } from "../../services/medicineExtraction";

import {
  useNavigation,
  NavigationProp,
} from "@react-navigation/native";

type RootStackParamList = {
  Main: undefined;
};

export default function UploadMedicineScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
  const [labelImageUri, setLabelImageUri] = useState<string | null>(null);

  const [medicineName, setMedicineName] = useState("");
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [mrp, setMrp] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) setLocation(loc);
    })();
  }, []);

  const pickImage = async (
    type: "front" | "label",
    useCamera: boolean = false
  ) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission Denied",
        });
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.8,
        });

      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        if (type === "front") setFrontImageUri(uri);
        else setLabelImageUri(uri);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runOCR = async () => {
    if (!frontImageUri) {
      Toast.show({
        type: "error",
        text1: "Please upload front image",
      });
      return;
    }

    setExtracting(true);

    try {
      const extractedData = await extractMedicineDetails(
        frontImageUri,
        labelImageUri || undefined
      );

      if (extractedData?.name) setMedicineName(extractedData.name);
      if (extractedData?.manufacturer)
        setManufacturer(extractedData.manufacturer);
      if (extractedData?.batchNo) setBatchNo(extractedData.batchNo);
      if (extractedData?.mfdDate) setMfgDate(extractedData.mfdDate);
      if (extractedData?.expiryDate) {
        setExpiryDate(extractedData.expiryDate);
      }

      // Store extracted data for display
      setExtractedData(extractedData);
      if (extractedData?.mrp)
        setMrp(String(extractedData.mrp));
      if (extractedData?.type) setCategory(extractedData.type);

      Toast.show({
        type: "success",
        text1: "Details Extracted",
      });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "OCR Failed",
      });
    }

    setExtracting(false);
  };

  const uploadToFirebase = async () => {
    if (
      !medicineName ||
      !batchNo ||
      !manufacturer ||
      !quantity ||
      !expiryDate ||
      !category
    ) {
      Toast.show({
        type: "error",
        text1: "Fill all required fields",
      });
      return;
    }

    if (!user?.uid) {
      Toast.show({
        type: "error",
        text1: "User not authenticated",
      });
      return;
    }

    setLoading(true);

    try {
      const urls: string[] = [];

      const uploadImage = async (uri: string, name: string) => {
        const blob = await (await fetch(uri)).blob();
        const storageRef = ref(
          storage,
          `donations/${user.uid}/${Date.now()}_${name}.jpg`
        );
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
      };

      if (frontImageUri)
        urls.push(await uploadImage(frontImageUri, "front"));
      if (labelImageUri)
        urls.push(await uploadImage(labelImageUri, "label"));

      const [mm, yyyy] = expiryDate.split("/");

      if (!mm || !yyyy) {
        throw new Error("Invalid expiry format");
      }

      const expiryTS = Timestamp.fromDate(
        new Date(Number(yyyy), Number(mm) - 1)
      );

      await addDoc(collection(db, "donations"), {
        title: medicineName,
        description: description || "Medicine donation",
        category,
        quantity: Number(quantity),
        batchNo,
        manufacturer,
        mfgDate: mfgDate || null,
        expiryDate: expiryTS,
        mrp: mrp ? Number(mrp) : null,
        photos: urls,
        donorId: user.uid,
        donorName: user.name || user.email,
        createdAt: serverTimestamp(),
        location: location || null,
      });

      Toast.show({
        type: "success",
        text1: "Donation uploaded",
      });

      navigation.goBack();
    } catch (err) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: "Upload failed",
      });
    }

    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <LinearGradient
        colors={["#0f766e", "#14b8a6"]}
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: 30,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" color="#fff" size={24} />
          </TouchableOpacity>
          <Text
            style={{
              color: "white",
              fontSize: 22,
              fontWeight: "bold",
              marginLeft: 15,
            }}
          >
            Upload Medicine
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ padding: 20 }}>
        {/* Image Upload Section */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#374151' }}>
            Medicine Photos
          </Text>

          {/* Front Image */}
          <View style={{ marginBottom: 15 }}>
            <Text style={{ marginBottom: 8, color: '#6b7280' }}>Front Packaging Photo *</Text>
            {frontImageUri ? (
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: frontImageUri }}
                  style={{ width: '100%', height: 200, borderRadius: 8 }}
                />
                <TouchableOpacity
                  onPress={() => setFrontImageUri(null)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#ef4444',
                    borderRadius: 15,
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => pickImage('front', true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#0d9488',
                    padding: 15,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage('front', false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    padding: 15,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    borderWidth: 1,
                    borderColor: '#0d9488',
                  }}
                >
                  <Ionicons name="images" size={20} color="#0d9488" />
                  <Text style={{ color: '#0d9488', fontWeight: '600' }}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Label Image */}
          <View style={{ marginBottom: 15 }}>
            <Text style={{ marginBottom: 8, color: '#6b7280' }}>Label Details Photo (Optional)</Text>
            {labelImageUri ? (
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: labelImageUri }}
                  style={{ width: '100%', height: 200, borderRadius: 8 }}
                />
                <TouchableOpacity
                  onPress={() => setLabelImageUri(null)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#ef4444',
                    borderRadius: 15,
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => pickImage('label', true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#0d9488',
                    padding: 15,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage('label', false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    padding: 15,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    borderWidth: 1,
                    borderColor: '#0d9488',
                  }}
                >
                  <Ionicons name="images" size={20} color="#0d9488" />
                  <Text style={{ color: '#0d9488', fontWeight: '600' }}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Auto-Fill Button */}
          {frontImageUri && (
            <TouchableOpacity
              onPress={runOCR}
              disabled={extracting}
              style={{
                backgroundColor: '#8b5cf6',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginTop: 10,
              }}
            >
              {extracting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="scan" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    Auto-Fill with AI
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Extracted Data Display */}
        {extractedData && (
          <View style={{
            backgroundColor: '#f0fdf4',
            borderRadius: 8,
            padding: 15,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#86efac',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#065f46' }}>
                AI Extracted Labels
              </Text>
            </View>
            {extractedData.name && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ color: '#6b7280', width: 100 }}>Name:</Text>
                <Text style={{ color: '#374151', flex: 1 }}>{extractedData.name}</Text>
              </View>
            )}
            {extractedData.type && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ color: '#6b7280', width: 100 }}>Type:</Text>
                <Text style={{ color: '#374151', flex: 1 }}>{extractedData.type}</Text>
              </View>
            )}
            {extractedData.manufacturer && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ color: '#6b7280', width: 100 }}>Manufacturer:</Text>
                <Text style={{ color: '#374151', flex: 1 }}>{extractedData.manufacturer}</Text>
              </View>
            )}
            {extractedData.batchNo && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ color: '#6b7280', width: 100 }}>Batch No:</Text>
                <Text style={{ color: '#374151', flex: 1 }}>{extractedData.batchNo}</Text>
              </View>
            )}
            {extractedData.mfdDate && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ color: '#6b7280', width: 100 }}>Mfg Date:</Text>
                <Text style={{ color: '#374151', flex: 1 }}>{extractedData.mfdDate}</Text>
              </View>
            )}
            {extractedData.expiryDate && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ color: '#6b7280', width: 100 }}>Expiry:</Text>
                <Text style={{ color: '#374151', flex: 1 }}>{extractedData.expiryDate}</Text>
              </View>
            )}
            {extractedData.mrp && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ color: '#6b7280', width: 100 }}>MRP:</Text>
                <Text style={{ color: '#374151', flex: 1 }}>₹{extractedData.mrp}</Text>
              </View>
            )}
          </View>
        )}

        <TextInput
          placeholder="Medicine Name *"
          value={medicineName}
          onChangeText={setMedicineName}
          style={{ backgroundColor: "#eee", padding: 12, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Category *"
          value={category}
          onChangeText={setCategory}
          style={{ backgroundColor: "#eee", padding: 12, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Manufacturer *"
          value={manufacturer}
          onChangeText={setManufacturer}
          style={{ backgroundColor: "#eee", padding: 12, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Batch Number *"
          value={batchNo}
          onChangeText={setBatchNo}
          style={{ backgroundColor: "#eee", padding: 12, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Expiry Date (MM/YYYY) *"
          value={expiryDate}
          onChangeText={setExpiryDate}
          style={{ backgroundColor: "#eee", padding: 12, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Quantity *"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={{ backgroundColor: "#eee", padding: 12, marginBottom: 10 }}
        />

        <TouchableOpacity
          onPress={uploadToFirebase}
          disabled={loading}
          style={{
            backgroundColor: "#0d9488",
            padding: 15,
            alignItems: "center",
            marginTop: 20,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "bold" }}>
              Submit Donation
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}