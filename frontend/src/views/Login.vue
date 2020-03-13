<template>
	<v-container class="my-5">
		<link
			type="text/css"
			rel="stylesheet"
			href="https://cdn.firebase.com/libs/firebaseui/3.5.2/firebaseui.css"
		/>
		<v-card class="mx-auto" max-width="400">
			<v-card-text>To use scapp you need to login with your Google account</v-card-text>
			<v-card-actions>
				<div id="authContainer" class="mx-auto">
					<v-progress-circular indeterminate color="primary" v-if="loading" class="ma-auto"></v-progress-circular>
				</div>
			</v-card-actions>
		</v-card>
	</v-container>
</template>

<script lang="ts">
	import Vue from 'vue'
	import { auth, authStore } from '../firebase'
	import * as firebaseui from "firebaseui"
	import * as firebase from "firebase/app"
	import "firebase/auth"
	import router from '../router'
    var authUI = new firebaseui.auth.AuthUI(auth)

	export default Vue.extend({
		name: "Login",
		data: () => ({
			loading: true,
			authStore
		}),
		mounted() {
            var authContainer = document.getElementById("authContainer")
			authUI.start(authContainer, {
				signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
				callbacks: {
					uiShown: () => {
                        this.loading = false
                        if (authContainer.clientHeight > 70) {
                            authStore.loading = true
                        }
					},
					signInSuccessWithAuthResult() {
						router.push("/")
						return false
					}
                }
			})
		}
	})
</script>