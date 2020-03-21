<template>
	<div>
		<template
			v-for="url in [...connection.interfaces, ...(clientId == realClientId ? [] : [client.url])].filter(v => formatLocalUrl(v) != clientId.split('!')[1])"
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
	export default Vue.extend({
		props: {
			connection: Object,
			clientId: String,
			realClientId: String,
			client: Object,
			lines: Boolean
		},
		methods: {
			formatLocalUrl(url: string) {
				return (new URL(url)).hostname
			}
		}
	})
</script>