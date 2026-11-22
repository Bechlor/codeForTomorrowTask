export interface ChatRow {
  id: string;
  user_low_id: string;
  user_high_id: string;
  created_at: Date;
}

export interface MessageDto {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface ReadReceiptDto {
  userId: string;
  readAt: string;
}

export interface LastSeenDto {
  userId: string;
  messageId: string;
  updatedAt: string;
}
