# Chat Backend (Node.js + TypeScript + PostgreSQL + Firebase)

A REST backend for 1:1 chats. PostgreSQL stores users, chat records and membership. Firebase Firestore stores messages, per-message read receipts and per-user last-seen pointers.

## Requirements

- Node.js 20+
- Docker (or a PostgreSQL 14+ instance)
- A Firebase project with Firestore enabled
- Firebase service-account credentials with Firestore access

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

3. Create the relational schema:

   ```bash
   psql "postgresql://postgres:postgres@localhost:5432/chat_app" -f sql/001_init.sql
   ```

4. Configure environment:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL`, `FIREBASE_PROJECT_ID`, and either:
   - `GOOGLE_APPLICATION_CREDENTIALS` to the path of your downloaded Firebase service-account JSON; or
   - `FIREBASE_SERVICE_ACCOUNT_JSON` to the JSON content as a single-line environment value.

   Never commit the service-account file or `.env`.

5. Start the API:

   ```bash
   npm run dev
   ```

   Production build:

   ```bash
   npm run build
   npm start
   ```

The API listens on `http://localhost:3000`. `GET /health` is a health check.

## User bootstrap

The task did not specify a user-creation endpoint, but chat creation requires both users to exist. Use the included helper endpoint (or insert users directly into PostgreSQL):

```http
POST /users
Content-Type: application/json

{
  "userId": "6c17c8e1-44fd-4f58-aab8-7b944f8e2a1a",
  "displayName": "Asha"
}
```

Call it for each participant. In a real deployment, replace this open helper endpoint with a trusted identity-provider integration (for example, verify Firebase Authentication ID tokens and derive the user ID from the token). **The sample endpoints accept user IDs in request bodies and are not production authentication.** Do not expose them publicly without authentication and authorization.

## API

All IDs for relational users and chats are UUIDs. Message IDs are Firestore document IDs.

### 1. Create or get a 1:1 chat

```http
POST /chat/create
Content-Type: application/json

{ "userAId": "UUID", "userBId": "UUID" }
```

Response:

```json
{ "chatId": "UUID" }
```

The user pair is sorted and protected by a unique database constraint, so repeated or concurrent requests return the same chat.

### 2. Send a message

```http
POST /chat/CHAT_UUID/message/send
Content-Type: application/json

{ "senderId": "USER_UUID", "text": "Hello!" }
```

Response includes `messageId`, `chatId`, `senderId`, `text`, and `createdAt`. Only chat members may send.

### 3. Get messages

```http
GET /chat/CHAT_UUID/messages?userId=USER_UUID&limit=50
```

Returns messages in ascending chronological order (oldest first within the latest `limit` messages). `limit` defaults to 50 and is capped at 100. `userId` is required so membership can be checked.

### 4. Mark a message read

```http
POST /chat/CHAT_UUID/message/MESSAGE_ID/read
Content-Type: application/json

{ "userId": "USER_UUID" }
```

Creates/updates `chats/{chatId}/messages/{messageId}/readReceipts/{userId}`.

### 5. Update last seen message

```http
POST /chat/CHAT_UUID/lastseen
Content-Type: application/json

{ "userId": "USER_UUID", "messageId": "MESSAGE_ID" }
```

Creates/updates `chats/{chatId}/lastSeen/{userId}`.

### 6. List a user's chats

```http
GET /user/USER_UUID/chats
```

Returns chat IDs, creation timestamps and member ID arrays from PostgreSQL.

## Firestore data layout

```text
chats/{chatId}
  messages/{messageId}
    chatId, senderId, text, createdAt, createdAtMs
    readReceipts/{userId}
      userId, readAt, readAtMs
  lastSeen/{userId}
    userId, messageId, updatedAt, updatedAtMs
```

The numeric millisecond fields provide deterministic query ordering and are stored alongside Firestore server timestamps. The API returns ISO-8601 timestamps. Firestore security rules should deny direct client writes; route client access through this API or implement equivalent authenticated rules.

## Notes / production hardening

- Add Firebase Authentication token verification (or another auth layer) and derive the acting user from the verified identity. The sample intentionally keeps auth out of scope to match the supplied API contract.
- Add rate limiting, request logging, monitoring, and message-retention policies.
- For large histories, add cursor pagination (`startAfter`) rather than relying only on `limit`.
- Consider validating that `lastseen` only moves forward based on the message ordering.
- The current design is 1:1. Group chats require a group membership model and authorization policy.
- Message edit/delete can be added with Firestore transactions and audit rules.
- Back up PostgreSQL and configure Firestore backups/retention for your environment.

## Scripts

- `npm run dev` – development server with reload
- `npm run typecheck` – strict TypeScript type-check
- `npm run build` – compile to `dist`
- `npm start` – run compiled server
