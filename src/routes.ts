import { Router } from "express";
import { z } from "zod";
import { HttpError } from "./middleware/error-handler";
import { createOrGetChat, listUserChats, upsertUser } from "./services/chat-service";
import { getMessages, markMessageRead, sendMessage, updateLastSeen } from "./services/message-service";

export const router = Router();
const uuid = z.string().uuid();

router.post("/users", async (req, res) => {
  const body = z.object({ userId: uuid, displayName: z.string().trim().min(1).max(120).optional() }).parse(req.body);
  res.status(201).json(await upsertUser(body.userId, body.displayName));
});

router.post("/chat/create", async (req, res) => {
  const body = z.object({ userAId: uuid, userBId: uuid }).parse(req.body);
  const chat = await createOrGetChat(body.userAId, body.userBId);
  res.status(200).json({ chatId: chat.id });
});

router.post("/chat/:chatId/message/send", async (req, res) => {
  const params = z.object({ chatId: uuid }).parse(req.params);
  const body = z.object({
    senderId: uuid,
    text: z.string().trim().min(1).max(10_000)
  }).parse(req.body);
  res.status(201).json(await sendMessage(params.chatId, body.senderId, body.text));
});

router.get("/chat/:chatId/messages", async (req, res) => {
  const params = z.object({ chatId: uuid }).parse(req.params);
  const query = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    userId: uuid
  }).parse(req.query);
  res.json({ messages: await getMessages(params.chatId, query.userId, query.limit) });
});

router.post("/chat/:chatId/message/:messageId/read", async (req, res) => {
  const params = z.object({ chatId: uuid, messageId: z.string().min(1) }).parse(req.params);
  const body = z.object({ userId: uuid }).parse(req.body);
  res.json(await markMessageRead(params.chatId, params.messageId, body.userId));
});

router.post("/chat/:chatId/lastseen", async (req, res) => {
  const params = z.object({ chatId: uuid }).parse(req.params);
  const body = z.object({ userId: uuid, messageId: z.string().min(1) }).parse(req.body);
  res.json(await updateLastSeen(params.chatId, body.userId, body.messageId));
});

router.get("/user/:userId/chats", async (req, res) => {
  const params = z.object({ userId: uuid }).parse(req.params);
  res.json({ chats: await listUserChats(params.userId) });
});
