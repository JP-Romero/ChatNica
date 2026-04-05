package com.chatnica.app.ui.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.chatnica.app.data.local.PreferencesManager
import com.chatnica.app.data.models.Post
import com.chatnica.app.data.models.Story
import com.chatnica.app.data.repository.FeedRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class FeedViewModel(
    private val repository: FeedRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _posts = MutableStateFlow<List<Post>>(emptyList())
    val posts: StateFlow<List<Post>> = _posts

    private val _stories = MutableStateFlow<List<Story>>(emptyList())
    val stories: StateFlow<List<Story>> = _stories

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    val currentUserId = MutableStateFlow("")

    init {
        viewModelScope.launch {
            currentUserId.value = preferencesManager.userId.first() ?: ""
        }
        loadFeed()
    }

    fun loadFeed() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getPosts()
                .onSuccess { _posts.value = it }
                .onFailure { _error.value = it.message }
            repository.getStories()
                .onSuccess { _stories.value = it }
                .onFailure { /* stories are optional */ }
            _isLoading.value = false
        }
    }

    fun likePost(postId: String) {
        viewModelScope.launch {
            val userId = preferencesManager.userId.first() ?: return@launch
            val post = _posts.value.find { it.id == postId } ?: return@launch
            repository.likePost(postId, userId, post.likes)
                .onSuccess { updated ->
                    _posts.value = _posts.value.map { if (it.id == postId) updated else it }
                }
                .onFailure { _error.value = it.message }
        }
    }

    fun createPost(body: String) {
        viewModelScope.launch {
            val userId = preferencesManager.userId.first() ?: return@launch
            repository.createPost(userId, body)
                .onSuccess { newPost -> _posts.value = listOf(newPost) + _posts.value }
                .onFailure { _error.value = it.message }
        }
    }

    fun clearError() { _error.value = null }

    class Factory(
        private val repository: FeedRepository,
        private val preferencesManager: PreferencesManager
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            FeedViewModel(repository, preferencesManager) as T
    }
}
