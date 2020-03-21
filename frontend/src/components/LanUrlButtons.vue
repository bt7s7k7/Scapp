<template>
	<div>
		<template
			v-for="url in urls"
		>
			<v-btn
				small
				text
				:to="url.includes('ngrok') ? realClientId : realClientId + '!' + formatLocalUrl(url)"
				:key="url"
				class="no-transform"
			>
				<v-icon small color="success" class="mr-1">mdi-check-circle</v-icon>
				<span class="grey--text">{{ formatLocalUrl(url) }}</span>
			</v-btn>
			<br v-if="lines" :key="url + '_'" />
		</template>
	</div>
</template>

<script lang="ts">
    import Vue from 'vue'
    import { connections } from "../connections"
    
    // This is outside because Vue was throwing up
    function formatLocalUrl(url: string) {
        try {
            return (new URL(url)).hostname
        } catch {
            return ""
        }
    }

	export default Vue.extend({
		props: {
			connection: Object,
			clientId: String,
			realClientId: String,
			client: Object,
			lines: Boolean
		},
		methods: {
			formatLocalUrl
        },
        computed: {
            urls() {
                return [
                    ...this.connection.interfaces, 
                    ...(this.clientId == this.realClientId ? [] : [this.client.url])
                ].filter(v => formatLocalUrl(v) != this.clientId.split('!')[1])
                    .filter(v => (v.includes("ngrok") ? connections[this.realClientId] : connections[this.realClientId + "!" + formatLocalUrl(v)])?.state == "online")
            }
        }
	})
</script>