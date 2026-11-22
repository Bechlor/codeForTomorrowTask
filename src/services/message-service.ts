import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../firebase";
import { HttpError } from "../middleware/error-handler";
import type { MessageDto } from "../types";
import { assertChatMember } from "./chat-service";

const chatRef = (chatId: string) => firestore.collection("chats").doc(chatId);
const messagesRef = (chatId: string) => chatRef(chatId).collection("messages");

export async function sendMessage(chatId: string, senderId: string, text: string): Promise<MessageDto> {
  await assertChatMember(chatId, senderId);
  const ref = messagesRef(chatId).doc();
  const createdAt = FieldValue.serverTimestamp();
  await ref.set({
    chatId, senderId, text, createdAt,
    createdAtMs: Date.now()
  });
  return {
    messageId: ref.id,
    chatId,
    senderId,
    text,
    createdAt: new Date().toISOString()
  };
}

export async function getMessages(chatId: string, userId: string, limit: number) {
  await assertChatMember(chatId, userId);
  const snapshot = await messagesRef(chatId)
    .orderBy("createdAtMs", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      messageId: doc.id,
      chatId,
      senderId: data.senderId as string,
      text: data.text as string,
      createdAt: new Date(data.createdAtMs as number).toISOString()
    };
  }).reverse();
}

export async function markMessageRead(chatId: string, messageId: string, userId: string) {
  await assertChatMember(chatId, userId);
  const message = messagesRef(chatId).doc(messageId);
  const snapshot = await message.get();
  if (!snapshot.exists) throw new HttpError(404, "Message not found");

  const readAt = new Date().toISOString();
  await message.collection("readReceipts").doc(userId).set({
    userId,
    readAt: FieldValue.serverTimestamp(),
    readAtMs: Date.now()
  }, { merge: true });

  return { messageId, userId, readAt };
}

export async function updateLastSeen(chatId: string, userId: string, messageId: string) {
  await assertChatMember(chatId, userId);
  const message = await messagesRef(chatId).doc(messageId).get();
  if (!message.exists) throw new HttpError(404, "Message not found");

  const updatedAt = new Date().toISOString();
  await chatRef(chatId).collection("lastSeen").doc(userId).set({
    userId,
    messageId,
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtMs: Date.now()
  }, { merge: true });

  return { userId, messageId, updatedAt };
}
