<template>
	<v-container class="my-5">
		<v-card class="mt-2 mr-2 client-card" v-for="client in clients" :key="client.id" max-width="400">
			<v-card-title>{{ client.name }}</v-card-title>
			<v-card-actions>
				<status-indicator :status="connections[client.id].state"></status-indicator>
				<span class="grey--text">{{ client.url }}</span>
				<v-spacer></v-spacer>
				<v-btn text :to="client.id">view</v-btn>
			</v-card-actions>
		</v-card>
	</v-container>
</template>

<style>
    .client-card {
        display: inline-block;
    }
</style>

<script lang="ts">
	import { authStore, auth } from "../firebase"
	import * as firebaseui from "firebaseui"
	import Vue from "vue"
	import { db } from "../firebase"
	import { IClientDocument } from "../../../common/types"
	import { updateConnections, connections } from "../connections"
	import StatusIndicator from "../components/StatusIndicator.vue"

	export default Vue.extend({
		name: "Home",
		components: {
			StatusIndicator
		},
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
