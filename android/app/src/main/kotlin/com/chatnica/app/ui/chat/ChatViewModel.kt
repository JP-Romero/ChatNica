package com.chatnica.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.chatnica.app.data.local.PreferencesManager
import com.chatnica.app.data.models.Message
import com.chatnica.app.data.repository.ConversationsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class ChatViewModel(
    private val repository: ConversationsRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private var conversationId: String = ""

    val currentUserId: MutableStateFlow<String> = MutableStateFlow("")

    init {
        viewModelScope.launch {
            currentUserId.value = preferencesManager.userId.first() ?: ""
        }
    }

    fun loadMessages(convId: String) {
        conversationId = convId
        viewModelScope.launch {
            _isLoading.value = true
            repository.getMessages(convId)
                .onSuccess { _messages.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun sendMessage(body: String) {
        if (body.isBlank()) return
        viewModelScope.launch {
            val senderId = preferencesManager.userId.first() ?: return@launch
            repository.sendMessage(conversationId, senderId, body)
                .onSuccess { newMessage ->
                    _messages.value = _messages.value + newMessage
                }
                .onFailure { _error.value = it.message }
        }
    }

    fun clearError() { _error.value = null }

    class Factory(
        private val repository: ConversationsRepository,
        private val preferencesManager: PreferencesManager
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            ChatViewModel(repository, preferencesManager) as T
    }
}
