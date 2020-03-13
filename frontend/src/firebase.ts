import * as firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"

export const firebaseApp = firebase.initializeApp({
    apiKey: "AIzaSyD6rSFHcbvP6ZtSDH9JniL_IFbdTDjoUEk",
    authDomain: "system-control-app.firebaseapp.com",
    databaseURL: "https://system-control-app.firebaseio.com",
    projectId: "system-control-app",
    storageBucket: "system-control-app.appspot.com",
    messagingSenderId: "699016296695",
    appId: "1:699016296695:web:84222fcb5654ad5bc07bf2",
    measurementId: "G-Z8BDDYF2B9"
})

export const auth = firebaseApp.auth()

export const authStore = {
    currentUser: auth.currentUser,
    loading: true
}

auth.onAuthStateChanged(user=>{
    authStore.currentUser = user
    authStore.loading = false

    console.log(user)
})

export const db = firebaseApp.firestore()