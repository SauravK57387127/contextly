-- chunks already cascades from documents, but let's confirm/ensure it explicitly
ALTER TABLE chunks DROP CONSTRAINT IF EXISTS chunks_document_id_fkey;
ALTER TABLE chunks ADD CONSTRAINT chunks_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- chats cascades from documents
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_document_id_fkey;
ALTER TABLE chats ADD CONSTRAINT chats_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- messages cascades from chats — this is the one that would've bitten you next
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_chat_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_chat_id_fkey
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;
