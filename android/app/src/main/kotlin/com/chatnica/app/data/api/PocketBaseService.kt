package com.chatnica.app.data.api

import com.chatnica.app.data.models.AuthResponse
import com.chatnica.app.data.models.Comment
import com.chatnica.app.data.models.Contact
import com.chatnica.app.data.models.Conversation
import com.chatnica.app.data.models.Message
import com.chatnica.app.data.models.PocketBaseList
import com.chatnica.app.data.models.Post
import com.chatnica.app.data.models.Story
import com.chatnica.app.data.models.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import okhttp3.Request
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources

class PocketBaseService(private val client: ApiClient) {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    // ─── Auth ────────────────────────────────────────────────────────────────

    suspend fun authWithEmail(email: String, password: String): Result<AuthResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val body = buildJsonObject {
                    put("identity", email)
                    put("password", password)
                }
                val response = client.post(
                    "/api/collections/users/auth-with-password",
                    body.toString()
                )
                json.decodeFromString<AuthResponse>(response)
            }
        }

    suspend fun createAccount(email: String, password: String, name: String): Result<AuthResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val createBody = buildJsonObject {
                    put("email", email)
                    put("password", password)
                    put("passwordConfirm", password)
                    put("name", name)
                }
                client.post("/api/collections/users/records", createBody.toString())
                // After creation, authenticate to get the token
                val authBody = buildJsonObject {
                    put("identity", email)
                    put("password", password)
                }
                val response = client.post(
                    "/api/collections/users/auth-with-password",
                    authBody.toString()
                )
                json.decodeFromString<AuthResponse>(response)
            }
        }

    // ─── Users ───────────────────────────────────────────────────────────────

    suspend fun getUser(id: String): Result<User> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = client.get("/api/collections/users/records/$id")
                json.decodeFromString<User>(response)
            }
        }

    suspend fun updateUser(id: String, name: String, bio: String, city: String): Result<User> =
        withContext(Dispatchers.IO) {
            runCatching {
                val body = buildJsonObject {
                    put("name", name)
                    put("bio", bio)
                    put("city", city)
                }
                val response = client.patch("/api/collections/users/records/$id", body.toString())
                json.decodeFromString<User>(response)
            }
        }

    suspend fun searchUsers(query: String): Result<List<User>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val encodedQuery = java.net.URLEncoder.encode("name~\"$query\" || email~\"$query\"", "UTF-8")
                val response = client.get("/api/collections/users/records?filter=$encodedQuery&perPage=20")
                json.decodeFromString<PocketBaseList<User>>(response).items
            }
        }

    // ─── Conversations ────────────────────────────────────────────────────────

    suspend fun getConversations(userId: String): Result<List<Conversation>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val encodedFilter = java.net.URLEncoder.encode("members~\"$userId\"", "UTF-8")
                val response = client.get(
                    "/api/collections/conversations/records?filter=$encodedFilter&sort=-updated&perPage=50"
                )
                json.decodeFromString<PocketBaseList<Conversation>>(response).items
            }
        }

    suspend fun createConversation(name: String, members: List<String>, isGroup: Boolean): Result<Conversation> =
        withContext(Dispatchers.IO) {
            runCatching {
                val body = buildJsonObject {
                    put("name", name)
                    put("isGroup", isGroup)
                    putJsonArray("members") { members.forEach { add(kotlinx.serialization.json.JsonPrimitive(it)) } }
                }
                val response = client.post("/api/collections/conversations/records", body.toString())
                json.decodeFromString<Conversation>(response)
            }
        }

    // ─── Messages ─────────────────────────────────────────────────────────────

    suspend fun getMessages(conversationId: String): Result<List<Message>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val encodedFilter = java.net.URLEncoder.encode("conversation=\"$conversationId\"", "UTF-8")
                val response = client.get(
                    "/api/collections/messages/records?filter=$encodedFilter&sort=created&perPage=100"
                )
                json.decodeFromString<PocketBaseList<Message>>(response).items
            }
        }

    suspend fun sendMessage(
        conversationId: String,
        senderId: String,
        body: String,
        type: String = "text"
    ): Result<Message> =
        withContext(Dispatchers.IO) {
            runCatching {
                val requestBody = buildJsonObject {
                    put("conversation", conversationId)
                    put("sender", senderId)
                    put("body", body)
                    put("type", type)
                }
                val response = client.post("/api/collections/messages/records", requestBody.toString())
                json.decodeFromString<Message>(response)
            }
        }

    // ─── Contacts ─────────────────────────────────────────────────────────────

    suspend fun getContacts(userId: String): Result<List<Contact>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val encodedFilter = java.net.URLEncoder.encode(
                    "requester=\"$userId\" || recipient=\"$userId\"",
                    "UTF-8"
                )
                val response = client.get(
                    "/api/collections/contacts/records?filter=$encodedFilter&perPage=100"
                )
                json.decodeFromString<PocketBaseList<Contact>>(response).items
            }
        }

    suspend fun sendContactRequest(requesterId: String, recipientId: String): Result<Contact> =
        withContext(Dispatchers.IO) {
            runCatching {
                val body = buildJsonObject {
                    put("requester", requesterId)
                    put("recipient", recipientId)
                    put("status", "pending")
                }
                val response = client.post("/api/collections/contacts/records", body.toString())
                json.decodeFromString<Contact>(response)
            }
        }

    suspend fun updateContact(id: String, status: String): Result<Contact> =
        withContext(Dispatchers.IO) {
            runCatching {
                val body = buildJsonObject { put("status", status) }
                val response = client.patch("/api/collections/contacts/records/$id", body.toString())
                json.decodeFromString<Contact>(response)
            }
        }

    // ─── Feed ─────────────────────────────────────────────────────────────────

    suspend fun getPosts(): Result<List<Post>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = client.get("/api/collections/posts/records?sort=-created&perPage=50")
                json.decodeFromString<PocketBaseList<Post>>(response).items
            }
        }

    suspend fun createPost(authorId: String, body: String): Result<Post> =
        withContext(Dispatchers.IO) {
            runCatching {
                val requestBody = buildJsonObject {
                    put("author", authorId)
                    put("body", body)
                }
                val response = client.post("/api/collections/posts/records", requestBody.toString())
                json.decodeFromString<Post>(response)
            }
        }

    suspend fun likePost(postId: String, userId: String, currentLikes: List<String>): Result<Post> =
        withContext(Dispatchers.IO) {
            runCatching {
                val updatedLikes = if (currentLikes.contains(userId)) {
                    currentLikes - userId
                } else {
                    currentLikes + userId
                }
                val body = buildJsonObject {
                    putJsonArray("likes") {
                        updatedLikes.forEach { add(kotlinx.serialization.json.JsonPrimitive(it)) }
                    }
                }
                val response = client.patch("/api/collections/posts/records/$postId", body.toString())
                json.decodeFromString<Post>(response)
            }
        }

    suspend fun getComments(postId: String): Result<List<Comment>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val encodedFilter = java.net.URLEncoder.encode("post=\"$postId\"", "UTF-8")
                val response = client.get(
                    "/api/collections/comments/records?filter=$encodedFilter&sort=created&perPage=50"
                )
                json.decodeFromString<PocketBaseList<Comment>>(response).items
            }
        }

    suspend fun createComment(postId: String, authorId: String, body: String): Result<Comment> =
        withContext(Dispatchers.IO) {
            runCatching {
                val requestBody = buildJsonObject {
                    put("post", postId)
                    put("author", authorId)
                    put("body", body)
                }
                val response = client.post("/api/collections/comments/records", requestBody.toString())
                json.decodeFromString<Comment>(response)
            }
        }

    // ─── Stories ──────────────────────────────────────────────────────────────

    suspend fun getStories(): Result<List<Story>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = client.get("/api/collections/stories/records?sort=-created&perPage=50")
                json.decodeFromString<PocketBaseList<Story>>(response).items
            }
        }

    // ─── Realtime (SSE) ───────────────────────────────────────────────────────

    fun subscribeToRealtime(
        collection: String,
        recordId: String,
        onEvent: (String) -> Unit
    ): okhttp3.Call {
        val baseUrl = runBlocking { client.httpClient }
        val token = client.getToken() ?: ""
        val pbUrl = runBlocking {
            com.chatnica.app.ChatNicaApplication.instance.preferencesManager.pbUrl.first()
                ?: com.chatnica.app.data.local.PreferencesManager.DEFAULT_PB_URL
        }
        val sseUrl = "$pbUrl/api/realtime"

        val request = Request.Builder()
            .url(sseUrl)
            .addHeader("Authorization", "Bearer $token")
            .build()

        val factory = EventSources.createFactory(client.httpClient)
        val listener = object : EventSourceListener() {
            override fun onEvent(
                eventSource: EventSource,
                id: String?,
                type: String?,
                data: String
            ) {
                if (data.isNotBlank()) onEvent(data)
            }

            override fun onFailure(eventSource: EventSource, t: Throwable?, response: okhttp3.Response?) {
                // Connection closed or error — callers can re-subscribe
            }
        }
        factory.newEventSource(request, listener)
        return client.httpClient.newCall(request)
    }
}

// Needed for runBlocking inside subscribeToRealtime
private fun <T> runBlocking(block: suspend () -> T): T = kotlinx.coroutines.runBlocking { block() }
