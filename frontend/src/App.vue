<template>
	<v-app>
		<template v-if="!authStore.loading">
			<v-app-bar app color="primary" dark dense>
                <v-icon class="mr-1">mdi-play-network</v-icon>
				<v-toolbar-title>Scapp</v-toolbar-title>
				<v-divider vertical inset class="mx-4"></v-divider>
				<v-btn text class="text-capitalize">Root</v-btn>
				<v-spacer></v-spacer>
				<template v-if="authStore.currentUser != null">
					<div>{{ authStore.currentUser.uid }}</div>
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
            auth
        }),
        
        watch: {
            authStore: {
                deep: true,
                handler() {
                    if (authStore.currentUser == null && !authStore.loading) {
                        if (router.currentRoute.path != "/login") router.push("/login")
                    }
                }
            }
        }
	});
</script>
