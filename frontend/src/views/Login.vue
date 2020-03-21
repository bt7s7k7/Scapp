<template>
	<v-container style="height: 100%">
		<v-card class="login-card" max-width="400">
			<v-card-text>To use scapp you need to login with your Google account</v-card-text>
            <v-btn class="login-help" href="https://github.com/bt7s7k7/Scapp/blob/master/README.md" text fab small>
                <v-icon>mdi-information</v-icon>
            </v-btn>
			<v-card-actions>
				<div id="authContainer" class="mx-auto">
					<v-progress-circular indeterminate color="primary" v-if="loading" class="ma-auto"></v-progress-circular>
				</div>
			</v-card-actions>
		</v-card>
	</v-container>
</template>

<style>
    .login-card {
        margin: auto;
        top: 50%;
        transform: translate(0, -100%);
    }

    .login-help {
        position: absolute;
        top: 4px;
        right: -50px
    }
</style>

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
			if (authContainer == null) throw new Error("Cannot find auth container")
			authUI.start(authContainer, {
				signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
				callbacks: {
					uiShown: () => {
						this.loading = false
                        // This is a hack to determine if 
                        // the user is logged in before we get an update from firebase
						if (authContainer && authContainer.clientHeight > 104) {
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