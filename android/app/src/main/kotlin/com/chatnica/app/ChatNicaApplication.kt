package com.chatnica.app

import android.app.Application
import com.chatnica.app.data.local.PreferencesManager

class ChatNicaApplication : Application() {
    lateinit var preferencesManager: PreferencesManager
        private set

    override fun onCreate() {
        super.onCreate()
        preferencesManager = PreferencesManager(this)
        instance = this
    }

    companion object {
        lateinit var instance: ChatNicaApplication
            private set
    }
}
