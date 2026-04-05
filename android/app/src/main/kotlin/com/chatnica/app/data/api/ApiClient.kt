package com.chatnica.app.data.api

import com.chatnica.app.data.local.PreferencesManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.io.File
import java.util.concurrent.TimeUnit

class ApiClient(private val preferencesManager: PreferencesManager) {

    private val json = "application/json; charset=utf-8".toMediaType()

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    private fun baseUrl(): String = runBlocking {
        preferencesManager.pbUrl.first() ?: PreferencesManager.DEFAULT_PB_URL
    }

    private fun authToken(): String? = runBlocking {
        preferencesManager.token.first()
    }

    private fun buildRequest(path: String): Request.Builder {
        val url = "${baseUrl()}$path"
        val builder = Request.Builder().url(url)
        authToken()?.let { token ->
            if (token.isNotBlank()) {
                builder.addHeader("Authorization", "Bearer $token")
            }
        }
        return builder
    }

    suspend fun get(path: String): String {
        val request = buildRequest(path).get().build()
        return executeRequest(request)
    }

    suspend fun post(path: String, body: String): String {
        val requestBody = body.toRequestBody(json)
        val request = buildRequest(path).post(requestBody).build()
        return executeRequest(request)
    }

    suspend fun patch(path: String, body: String): String {
        val requestBody = body.toRequestBody(json)
        val request = buildRequest(path).patch(requestBody).build()
        return executeRequest(request)
    }

    suspend fun delete(path: String): String {
        val request = buildRequest(path).delete().build()
        return executeRequest(request)
    }

    suspend fun postMultipart(path: String, fields: Map<String, String>, fileField: String? = null, file: File? = null): String {
        val multipartBuilder = MultipartBody.Builder().setType(MultipartBody.FORM)
        fields.forEach { (key, value) ->
            multipartBuilder.addFormDataPart(key, value)
        }
        if (fileField != null && file != null) {
            val extension = file.extension.lowercase()
            val mimeType = when (extension) {
                "png" -> "image/png"
                "gif" -> "image/gif"
                "webp" -> "image/webp"
                else -> "image/jpeg"
            }
            val mediaType = mimeType.toMediaType()
            multipartBuilder.addFormDataPart(fileField, file.name, RequestBody.create(mediaType, file))
        }
        val requestBody = multipartBuilder.build()
        val request = buildRequest(path).post(requestBody).build()
        return executeRequest(request)
    }

    private fun executeRequest(request: Request): String {
        httpClient.newCall(request).execute().use { response ->
            val responseBody = response.body?.string() ?: ""
            if (!response.isSuccessful) {
                throw ApiException(response.code, responseBody)
            }
            return responseBody
        }
    }

    fun setToken(token: String) {
        runBlocking { preferencesManager.saveToken(token) }
    }

    fun getToken(): String? = runBlocking {
        preferencesManager.token.first()
    }
}

class ApiException(val code: Int, message: String) : Exception("HTTP $code: $message")
