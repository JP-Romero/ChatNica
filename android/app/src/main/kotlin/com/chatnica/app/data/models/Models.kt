package com.chatnica.app.data.models

import kotlinx.serialization.Serializable

@Serializable
data class AuthRecord(
    val id: String,
    val email: String,
    val name: String = "",
    val avatar: String = "",
    val bio: String = "",
    val city: String = ""
)

@Serializable
data class AuthResponse(
    val token: String,
    val record: AuthRecord
)

@Serializable
data class User(
    val id: String,
    val name: String = "",
    val email: String = "",
    val avatar: String = "",
    val bio: String = "",
    val city: String = ""
)

@Serializable
data class Conversation(
    val id: String,
    val name: String = "",
    val isGroup: Boolean = false,
    val members: List<String> = emptyList(),
    val lastMessage: String = "",
    val lastMessageTime: String = "",
    val created: String = "",
    val updated: String = ""
)

@Serializable
data class Message(
    val id: String,
    val conversation: String,
    val sender: String,
    val body: String = "",
    val type: String = "text",
    val file: String = "",
    val replyTo: String = "",
    val created: String = "",
    val updated: String = ""
)

@Serializable
data class Post(
    val id: String,
    val author: String,
    val body: String = "",
    val image: String = "",
    val likes: List<String> = emptyList(),
    val created: String = "",
    val updated: String = ""
)

@Serializable
data class Comment(
    val id: String,
    val post: String,
    val author: String,
    val body: String,
    val created: String = ""
)

@Serializable
data class Story(
    val id: String,
    val author: String,
    val type: String = "image",
    val file: String = "",
    val text: String = "",
    val expires: String = "",
    val created: String = ""
)

@Serializable
data class Contact(
    val id: String,
    val requester: String,
    val recipient: String,
    val status: String = "pending",
    val created: String = ""
)

@Serializable
data class PocketBaseList<T>(
    val page: Int,
    val perPage: Int,
    val totalItems: Int,
    val totalPages: Int,
    val items: List<T>
)
