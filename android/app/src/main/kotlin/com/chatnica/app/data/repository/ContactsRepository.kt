package com.chatnica.app.data.repository

import com.chatnica.app.data.api.PocketBaseService
import com.chatnica.app.data.models.Contact
import com.chatnica.app.data.models.User

class ContactsRepository(private val service: PocketBaseService) {
    suspend fun getContacts(userId: String): Result<List<Contact>> =
        service.getContacts(userId)

    suspend fun sendContactRequest(requesterId: String, recipientId: String): Result<Contact> =
        service.sendContactRequest(requesterId, recipientId)

    suspend fun acceptContact(id: String): Result<Contact> =
        service.updateContact(id, "accepted")

    suspend fun rejectContact(id: String): Result<Contact> =
        service.updateContact(id, "rejected")

    suspend fun searchUsers(query: String): Result<List<User>> =
        service.searchUsers(query)
}
