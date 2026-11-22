import { db } from "../db";
import { HttpError } from "../middleware/error-handler";
import type { ChatRow } from "../types";

export async function createOrGetChat(userAId: string, userBId: string): Promise<ChatRow> {
  if (userAId === userBId) throw new HttpError(400, "A chat requires two different users");
  const [low, high] = [userAId, userBId].sort();

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const users = await client.query(
      "SELECT id FROM users WHERE id = ANY($1::uuid[])",
      [[low, high]]
    );
    if (users.rowCount !== 2) throw new HttpError(404, "Both users must exist");

    const inserted = await client.query<ChatRow>(
      `INSERT INTO chats (user_low_id, user_high_id)
       VALUES ($1, $2)
       ON CONFLICT (user_low_id, user_high_id) DO UPDATE SET user_low_id = EXCLUDED.user_low_id
       RETURNING id, user_low_id, user_high_id, created_at`,
      [low, high]
    );
    const chat = inserted.rows[0];
    if (!chat) throw new Error("Chat insert returned no row");

    await client.query(
      `INSERT INTO chat_members (chat_id, user_id)
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT DO NOTHING`,
      [chat.id, low, high]
    );
    await client.query("COMMIT");
    return chat;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function assertChatMember(chatId: string, userId: string): Promise<void> {
  const result = await db.query(
    "SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2",
    [chatId, userId]
  );
  if (result.rowCount === 0) throw new HttpError(403, "User is not a member of this chat");
}

export async function listUserChats(userId: string) {
  const user = await db.query("SELECT 1 FROM users WHERE id = $1", [userId]);
  if (user.rowCount === 0) throw new HttpError(404, "User not found");

  const result = await db.query(
    `SELECT c.id AS "chatId", c.created_at AS "createdAt",
            ARRAY_AGG(cm.user_id ORDER BY cm.user_id) AS "memberIds"
     FROM chats c
     JOIN chat_members mine ON mine.chat_id = c.id AND mine.user_id = $1
     JOIN chat_members cm ON cm.chat_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function upsertUser(userId: string, displayName?: string) {
  const result = await db.query(
    `INSERT INTO users (id, display_name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET display_name = COALESCE(EXCLUDED.display_name, users.display_name)
     RETURNING id, display_name AS "displayName", created_at AS "createdAt"`,
    [userId, displayName ?? null]
  );
  return result.rows[0];
}
