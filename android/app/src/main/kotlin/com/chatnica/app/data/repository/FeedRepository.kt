package com.chatnica.app.data.repository

import com.chatnica.app.data.api.PocketBaseService
import com.chatnica.app.data.models.Comment
import com.chatnica.app.data.models.Post
import com.chatnica.app.data.models.Story

class FeedRepository(private val service: PocketBaseService) {
    suspend fun getPosts(): Result<List<Post>> = service.getPosts()

    suspend fun createPost(authorId: String, body: String): Result<Post> =
        service.createPost(authorId, body)

    suspend fun likePost(postId: String, userId: String, currentLikes: List<String>): Result<Post> =
        service.likePost(postId, userId, currentLikes)

    suspend fun getComments(postId: String): Result<List<Comment>> =
        service.getComments(postId)

    suspend fun createComment(postId: String, authorId: String, body: String): Result<Comment> =
        service.createComment(postId, authorId, body)

    suspend fun getStories(): Result<List<Story>> = service.getStories()
}
