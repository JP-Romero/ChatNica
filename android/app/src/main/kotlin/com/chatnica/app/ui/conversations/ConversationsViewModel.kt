package com.chatnica.app.ui.conversations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.chatnica.app.data.local.PreferencesManager
import com.chatnica.app.data.models.Conversation
import com.chatnica.app.data.repository.ConversationsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class ConversationsViewModel(
    private val repository: ConversationsRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _conversations = MutableStateFlow<List<Conversation>>(emptyList())
    val conversations: StateFlow<List<Conversation>> = _conversations

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        loadConversations()
    }

    fun loadConversations() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            val userId = preferencesManager.userId.first()
            if (userId.isNullOrBlank()) {
                _error.value = "User not logged in"
                _isLoading.value = false
                return@launch
            }
            repository.getConversations(userId)
                .onSuccess { _conversations.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    suspend fun createConversation(name: String, members: List<String>, isGroup: Boolean): Result<Conversation> {
        val currentUserId = preferencesManager.userId.first() ?: ""
        val allMembers = if (currentUserId.isNotBlank() && !members.contains(currentUserId)) {
            members + currentUserId
        } else members
        val result = repository.createConversation(name, allMembers, isGroup)
        if (result.isSuccess) loadConversations()
        return result
    }

    fun clearError() { _error.value = null }

    class Factory(
        private val repository: ConversationsRepository,
        private val preferencesManager: PreferencesManager
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            ConversationsViewModel(repository, preferencesManager) as T
    }
}
