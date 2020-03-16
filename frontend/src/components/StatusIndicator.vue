<template>
	<v-icon small class="mr-1" color="success" v-if="status == 'online'">mdi-check-circle</v-icon>
	<v-icon small class="mr-1" color="primary" v-else-if="status == 'connecting'">mdi-sync-circle</v-icon>
	<v-icon small class="mr-1" color="error" v-else>mdi-close-circle</v-icon>
</template>

<script lang="ts">
	import Vue from 'vue'
	export default Vue.extend({
		name: "StatusIndicator",
		props: {
			status: String
		}
	})
</script>