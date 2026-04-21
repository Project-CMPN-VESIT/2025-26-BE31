import { collection, doc, setDoc, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const createChatRoom = async (matchId: string, donorId: string, receiverId: string, donationId: string) => {
    const chatRef = doc(db, 'chatRooms', matchId);
    await setDoc(chatRef, {
        id: matchId,
        donorId,
        receiverId,
        donationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: 'Chat started'
    }, { merge: true });
};

export const sendMessage = async (chatRoomId: string, senderId: string, text: string) => {
    const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
    await addDoc(messagesRef, {
        senderId,
        text,
        createdAt: serverTimestamp()
    });

    // Update last message in the chat room
    const chatRef = doc(db, 'chatRooms', chatRoomId);
    await setDoc(chatRef, {
        lastMessage: text,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const subscribeToMessages = (chatRoomId: string, callback: (messages: any[]) => void) => {
    const q = query(collection(db, 'chatRooms', chatRoomId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    });
};
export const subscribeToChatRoom = (chatRoomId: string, callback: (data: any) => void) => {
    const chatRef = doc(db, 'chatRooms', chatRoomId);
    return onSnapshot(chatRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() });
        }
    });
};
