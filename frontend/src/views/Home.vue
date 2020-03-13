<template>
	<v-container class="my-5">
		<v-card class="mx-auto" v-for="client in clients" :key="client.id">
			<v-card-title>{{ client.name }}</v-card-title>
            <v-card-text>
                <v-icon small class="mr-1" color="success" v-if="connections[client.id].state == 'online'">mdi-check-circle</v-icon>
                <v-icon small class="mr-1" color="primary" v-else-if="connections[client.id].state == 'connecting'">mdi-sync-circle</v-icon>
                <v-icon small class="mr-1" color="error" v-else>mdi-close-circle</v-icon>
                <span>{{ client.url }}</span>
            </v-card-text>
		</v-card>
	</v-container>
</template>

<script lang="ts">
	import { authStore, auth } from "../firebase"
	import * as firebaseui from "firebaseui"
	import Vue from "vue"
	import { db } from "../firebase"
    import { IClientDocument } from "../../../common/types"
    import { updateConnections, connections } from "../connections"

	export default Vue.extend({
		name: "Home",
		components: {},
		data: () => ({
			auth: authStore,
            clients: [] as (IClientDocument & { id: string })[],
            connections
		}),
		mounted(this: Vue) {
            if (!authStore.currentUser) return
			this.$bind("clients", db.collection("clients").where("allowedUsers", "array-contains", authStore.currentUser.uid))
        },
        watch: {
            clients() {
                updateConnections(this.clients)
            }    
        }
	})
</script>
