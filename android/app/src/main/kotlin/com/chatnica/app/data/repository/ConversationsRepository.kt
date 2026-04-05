package com.chatnica.app.data.repository

import com.chatnica.app.data.api.PocketBaseService
import com.chatnica.app.data.models.Conversation
import com.chatnica.app.data.models.Message

class ConversationsRepository(private val service: PocketBaseService) {
    suspend fun getConversations(userId: String): Result<List<Conversation>> =
        service.getConversations(userId)

    suspend fun getMessages(conversationId: String): Result<List<Message>> =
        service.getMessages(conversationId)

    suspend fun sendMessage(conversationId: String, senderId: String, body: String): Result<Message> =
        service.sendMessage(conversationId, senderId, body)

    suspend fun createConversation(name: String, members: List<String>, isGroup: Boolean): Result<Conversation> =
        service.createConversation(name, members, isGroup)
}
