<template>
	<v-container class="mx-5" v-if="!('loading' in $data) && client.id in connections">
		<v-card class="mx-auto">
			<v-card-title primary-title>
				<span class="display-3">{{ client.name }}</span>
			</v-card-title>
			<v-card-actions>
				<status-indicator :status="connections[client.id].state"></status-indicator>
				<span class="grey--text">{{ client.url }}</span>
				<v-spacer></v-spacer>
				<v-dialog v-model="usersDialog" max-width="500px">
					<template v-slot:activator="{ on }">
						<v-btn fab small text slot="activator" v-on="on">
							<v-icon>mdi-account-multiple-plus</v-icon>
						</v-btn>
					</template>
					<v-card>
						<v-card-title>
							<span class="headline">Allowed users</span>
						</v-card-title>
						<v-card-text>
							<v-list>
								<v-list-item-group>
									<v-list-item v-for="user in client.allowedUsers" :key="user">
										<v-list-item-content>
											<v-list-item-title>
												<span :class="user == authStore.currentUser.uid ? 'green--text' : ''">{{ user }}</span>
											</v-list-item-title>
										</v-list-item-content>
										<v-list-item-action>
											<v-btn fab text small @click="removeUser(user)">
												<v-icon>mdi-account-remove</v-icon>
											</v-btn>
										</v-list-item-action>
									</v-list-item>
								</v-list-item-group>
							</v-list>
						</v-card-text>
						<v-card-actions>
							<v-dialog v-model="userAddDialog" max-width="400">
								<template v-slot:activator="{ on }">
									<v-btn v-on="on" text fab small>
										<v-icon>mdi-account-plus</v-icon>
									</v-btn>
								</template>
								<v-card>
									<v-card-title>
										<span class="headline">Add user</span>
									</v-card-title>
									<v-form @submit="$event.preventDefault()">
										<v-card-text>
											<v-text-field name="userId" label="User ID" id="userId" v-model="userIdToAdd"></v-text-field>
										</v-card-text>
										<v-card-actions>
											<v-spacer></v-spacer>
											<v-btn
												text
												@click="addUser(userIdToAdd); userAddDialog = false; userIdToAdd = ''"
												type="submit"
											>add</v-btn>
											<v-btn text @click="userAddDialog = false; userIdToAdd = ''">cancel</v-btn>
										</v-card-actions>
									</v-form>
								</v-card>
							</v-dialog>
							<v-spacer></v-spacer>
							<v-btn text @click.native="usersDialog = false">Save</v-btn>
						</v-card-actions>
					</v-card>
				</v-dialog>
				<v-dialog v-model="deleteDialog" max-width="400">
					<template v-slot:activator="{ on }">
						<v-btn text fab small v-on="on">
							<v-icon>mdi-delete</v-icon>
						</v-btn>
					</template>
					<v-card>
						<v-card-title primary-title>Are you sure?</v-card-title>
						<v-card-text>
							This will delete this client and all allowed users from the database.
							After this the client's access token will be invalidated and you will
							have to run
							<code>scapp reset</code>.
						</v-card-text>
						<v-card-actions>
							<v-spacer></v-spacer>
							<v-btn text @click="deleteDialog = false; deleteClient()">delete</v-btn>
							<v-btn text color="primary" @click="deleteDialog = false">cancel</v-btn>
						</v-card-actions>
					</v-card>
				</v-dialog>
			</v-card-actions>
		</v-card>
        <template v-if="connections[client.id] && connections[client.id].state == 'online'">
		<v-card class="mt-2">
			<v-card-title primary-title>Actions</v-card-title>
			<v-card-text>
				<v-list>
					<v-list-item-group>
						<v-list-item
							v-for="actionId in Object.keys(connections[client.id].runningActions)"
							:key="actionId"
                            
						>
							<v-list-item-content class="pa-0">{{ connections[client.id].runningActions[actionId].label }}</v-list-item-content>
							<v-list-item-action  class="my-0">
								<v-btn small fab text @click="killAction(actionId)">
									<v-icon>mdi-stop-circle</v-icon>
								</v-btn>
							</v-list-item-action>
						</v-list-item>
					</v-list-item-group>
				</v-list>
			</v-card-text>
			<v-card-actions>
				<v-btn small @click="startTerminal()">
					<v-icon right>mdi-console</v-icon>
                    Start terminal
				</v-btn>
			</v-card-actions>
		</v-card>
        </template>
	</v-container>
	<v-progress-circular indeterminate color="primary" class="ma-auto" v-else></v-progress-circular>
</template>

<script lang="ts">
	import Vue from 'vue'
	import { db, authStore } from "../firebase"
	import { IClientDocument } from "../../../common/types"
	import { connections, updateConnections, requestActionKill, requestStartTerminal } from "../connections"
	import StatusIndicator from "../components/StatusIndicator.vue"
	import firebase from "firebase/app"
	import router from '../router'

	export default Vue.extend({
		name: "Client",
		components: {
			StatusIndicator
		},
		data: () => ({
			client: { loading: true } as IClientDocument & { id: string, loading: true | null },
			connections,
			usersDialog: false,
			userAddDialog: false,
			userIdToAdd: "",
			authStore,
			deleteDialog: false
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
		},
		methods: {
			addUser(userId: string) {
				db.collection("clients").doc(this.clientId).update({
					allowedUsers: firebase.firestore.FieldValue.arrayUnion(userId) as any as string[]
				} as IClientDocument)
			},
			removeUser(userId: string) {
				db.collection("clients").doc(this.clientId).update({
					allowedUsers: firebase.firestore.FieldValue.arrayRemove(userId) as any as string[]
				} as IClientDocument)
			},
			deleteClient() {
				db.collection("clients").doc(this.clientId).delete()
				router.push("/")
            },
            killAction(id: string) {
                requestActionKill(connections[this.clientId], id)
            },
            startTerminal() {
                requestStartTerminal(connections[this.clientId])
            }
		}

	})
</script>