<template>
	<v-app>
		<template v-if="!authStore.loading">
			<v-app-bar app color="primary" dark dense>
				<router-link to="/">
					<v-toolbar-title class="white--text">
						<v-icon class="mr-1">mdi-play-network</v-icon>
                        Scapp
					</v-toolbar-title>
				</router-link>
				<v-spacer></v-spacer>
				<template v-if="authStore.currentUser != null">
					<div id="userIdText">{{ authStore.currentUser.uid }}</div>
                    <v-dialog v-model="userIdDialog">
                        <template v-slot:activator="{ on }">
                            <v-btn v-on="on" id="userIdDialogButton" text fab small>
                                <v-icon>mdi-account</v-icon>
                            </v-btn>
                        </template>
                        <v-card>
                            <v-card-title>
                                User ID
                            </v-card-title>
                            <v-card-text>
                                {{ authStore.currentUser.uid }}
                            </v-card-text>
                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn text @click="userIdDialog = false">
                                    close
                                </v-btn>
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

    @media screen and (max-width: 420px) {
        #userIdText {
            display: none;
        }

        #userIdDialogButton {
            display: initial;
        }
    }
</style>

<script lang="ts">
	import Vue from 'vue';
	import { authStore, auth } from './firebase';
	import router from './router';

	export default Vue.extend({
		name: 'App',

		components: {
		},

		data: () => ({
			authStore,
            auth,
            userIdDialog: false
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
			}
		}
	});
</script>
