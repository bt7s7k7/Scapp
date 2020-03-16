<template>
	<v-container class="mx-5" v-if="!('loading' in $data)">
		<v-card class="mx-auto">
			<v-card-title primary-title>{{ client.name }}</v-card-title>
            <v-card-actions>
                <status-indicator :status="connections[client.id]" ></status-indicator>
                <span class="grey--text">{{ client.url }}</span>
                <v-spacer></v-spacer>
            </v-card-actions>
		</v-card>
	</v-container>
	<v-progress-circular indeterminate color="primary" class="ma-auto" v-else></v-progress-circular>
</template>

<script lang="ts">
	import Vue from 'vue'
	import { db } from "../firebase"
    import { IClientDocument } from "../../../common/types"
    import { connections, updateConnections } from "../connections"
    import StatusIndicator from "../components/StatusIndicator.vue"

	export default Vue.extend({
        name: "Client",
        components: {
            StatusIndicator
        },
		data: () => ({
            client: { loading: true } as IClientDocument & { id: string, loading: true | null },
            connections
		}),
		mounted(this: Vue & any) {
			this.$bind("client", db.collection("clients").doc(this.clientId))
		},
		props: {
			clientId: String
        },
        computed: {
            connection(this: any) {
                return connections[this.clientId]
            }
        },
        watch: {
            client() {
                updateConnections([this.client])
            }    
        }

	})
</script>