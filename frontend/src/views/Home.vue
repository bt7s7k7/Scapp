<template>
	<div class="home-cards">
        <div v-for="col in cols.num" :key="col">
		<v-card
			v-for="{client, actionsNum, errorsNum, connection, url} in clientCards.filter((_, i) => i % cols.num == col - 1)"
			:key="client.id"
			class="mt-2 mr-2 client-card"
            width="100%"
			:to="client.id"
			hover
		>
			<v-card-title>{{ client.name }}</v-card-title>
			<v-card-actions>
				<template v-if="url.length > 0">
					<status-indicator :status="connection.state"></status-indicator>
					<span class="grey--text">{{ url }}</span>
					<v-spacer></v-spacer>
					<template v-if="actionsNum > 0">
						<v-progress-circular indeterminate size="16" class="mr-1" color="primary"></v-progress-circular>
						{{ actionsNum }}
					</template>
					<template v-if="errorsNum > 0">
						<v-icon small color="error" class="ml-2">mdi-alert</v-icon>
						{{ errorsNum }}
					</template>
				</template>
				<template v-else>
					<v-icon small class="mr-1" color="orange">mdi-alert-decagram</v-icon>
					<span class="grey--text">Brand new</span>
				</template>
			</v-card-actions>
		</v-card>
        </div>
	</div>
</template>

<style>
	.client-card {
		display: inline-block !important;
	}

	.home-cards {
        margin: 50px;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .home-cards > * {
        display: flex;
        flex: 1 1;
        padding: 4px;
        flex-direction: column;
    }
</style>

<script lang="ts">
	import { authStore, auth } from "../firebase"
	import * as firebaseui from "firebaseui"
	import Vue from "vue"
	import { db } from "../firebase"
	import { IClientDocument } from "../../../common/types"
	import { updateConnections, connections, IConnection } from "../connections"
    import StatusIndicator from "../components/StatusIndicator.vue"

    var cols = {
        num: 3
    }

    window.addEventListener("resize", ()=>{
        var space = window.innerWidth - 100
        cols.num = Math.max(1, Math.floor(space / 240))
    })

	export default Vue.extend({
		name: "Home",
		components: {
			StatusIndicator
		},
		data: () => ({
			auth: authStore,
			clients: [] as (IClientDocument & { id: string })[],
            connections,
            cols
		}),
		mounted(this: Vue) {
			if (!authStore.currentUser) return
            this.$bind("clients", db.collection("clients").where("allowedUsers", "array-contains", authStore.currentUser.uid))
		},
		watch: {
			clients() {
				updateConnections(this.clients)
			}
		},
		computed: {
			clientCards() {
				return (this.clients as (IClientDocument & { id: string })[]).map(v => {
					var connection = this.connections[v.id] as IConnection
					var actions = Object.values(connection.runningActions)
					var errorsNum = actions.filter(v => v.exitCode != 0).length
					var actionsNum = actions.length - errorsNum - 1
					if (connection.state != "online") errorsNum = actionsNum = 0
					return {
						client: v,
						actionsNum,
						errorsNum,
						connection,
						url: v.url.split(".")[0]
					}
				})
			}
		}
	})
</script>
