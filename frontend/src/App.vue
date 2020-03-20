<template>
	<v-app>
		<template v-if="!authStore.loading">
			<v-app-bar app color="primary" dark dense>
				<router-link to="/">
					<v-toolbar-title class="white--text">
						<v-icon class="mr-1">mdi-play-network</v-icon>Scapp
					</v-toolbar-title>
				</router-link>
				<v-spacer></v-spacer>
				<template v-if="authStore.currentUser != null">
					<v-btn id="userIdText" @click="userIdDialog = true" text>{{ authStore.currentUser.email }}</v-btn>
					<v-dialog v-model="userIdDialog" max-width="400">
						<template v-slot:activator="{ on }">
							<v-btn v-on="on" id="userIdDialogButton" text fab small>
								<v-icon>mdi-account</v-icon>
							</v-btn>
						</template>
						<v-card>
							<v-card-title>User ID</v-card-title>
							<v-card-text>
								{{ authStore.currentUser.uid }}
								<v-row align="center" style="margin-left: 0" class="mt-2">
									<v-text-field
										label="Email"
										v-model="email"
										:error-messages="emailChangeError"
										@keydown.enter="saveEmail()"
									></v-text-field>
									<v-progress-circular
										indeterminate
										color="primary"
										size="32"
										class="mx-5"
										v-if="emailChangeLoading"
									></v-progress-circular>
									<v-btn text @click="saveEmail()" v-else>save</v-btn>
								</v-row>
							</v-card-text>
							<v-card-actions>
								<v-spacer></v-spacer>
								<v-btn text @click="userIdDialog = false">close</v-btn>
							</v-card-actions>
						</v-card>
					</v-dialog>
					<v-btn text small fab @click="auth.signOut()">
						<v-icon>mdi-logout-variant</v-icon>
					</v-btn>
				</template>
			</v-app-bar>

			<v-content>
				<router-view></router-view>
			</v-content>
		</template>
		<template v-else>
			<v-progress-circular indeterminate color="primary" class="ma-auto"></v-progress-circular>
		</template>
	</v-app>
</template>

<style>
	#userIdDialogButton {
		display: none;
	}

	#userIdText {
		text-transform: none;
	}

	@media screen and (max-width: 420px) {
		#userIdText {
			display: none;
		}

		#userIdDialogButton {
			display: initial;
		}
	}

	*::-webkit-scrollbar {
		width: 8px;
	}
	*::-webkit-scrollbar-track {
		background-color: #eeeeee;
	}
	*::-webkit-scrollbar-thumb {
		background-color: #dddddd;
	}
</style>

<script lang="ts">
	import Vue from 'vue';
	import { authStore, auth, functions } from './firebase';
	import router from './router';

	export default Vue.extend({
		name: 'App',

		components: {
		},

		data: () => ({
			authStore,
			auth,
			userIdDialog: false,
			email: "",
			emailChangeLoading: false,
			emailChangeError: ""
		}),

		watch: {
			authStore: {
				deep: true,
				handler() {
					if (!authStore.loading) {
						if (authStore.currentUser == null && router.currentRoute.path != "/login") router.push("/login")
						if (authStore.currentUser != null && router.currentRoute.path == "/login") router.push("/")
					}
				}
			},
			userIdDialog() {
				if (this.userIdDialog) {
					this.email = authStore.currentUser?.email ?? ""
					this.emailChangeError = ""
				}
			}
		},
		methods: {
			saveEmail() {
				this.emailChangeLoading = true
				functions.httpsCallable("changeUserEmail")({
					email: this.email
				}).then(result => {
					if (!result.data.success) {
						this.emailChangeError = result.data.details
					} else {
						if (authStore.currentUser) authStore.currentUser.email = this.email
					}
					this.emailChangeLoading = false
				}).catch(err => {
					this.emailChangeLoading = false
				})
			}
		}
	});
</script>
