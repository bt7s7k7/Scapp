<template>
	<div>Logged in</div>
</template>

<script lang="ts">
	import { authStore, auth } from "../firebase"
	import * as firebaseui from "firebaseui"
	import Vue from "vue"

	export default Vue.extend({
		name: "Home",
		components: {},
		data: () => ({
			auth: authStore
		})
	})
</script>
