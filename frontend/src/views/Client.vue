<template>
	<v-container class="my-5" v-if="!('loading' in $data) && client.id in connections">
		<v-card class="mx-auto">
			<v-card-title primary-title>
				<input class="display-3" v-model="client.name" @change="changeClientName()" style="width: 100%" />
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
								v-for="(action, actionId) in connection.runningActions"
								:key="actionId"
								@click="openXterm(actionId)"
							>
								<v-list-item-avatar v-if="action.exitCode != 0">
									<v-icon color="error">mdi-alert</v-icon>
								</v-list-item-avatar>
								<v-list-item-avatar v-else-if="actionId != '_internal@log'">
									<v-progress-circular color="primary" indeterminate class="progress-float"></v-progress-circular>
								</v-list-item-avatar>
								<v-list-item-content class="pa-0">
									<span>{{ action.label }}</span>
									<span class="grey--text">{{actionId}}</span>
								</v-list-item-content>
								<v-list-item-action class="my-0" v-if="actionId != '_internal@log'">
									<v-btn
										small
										fab
										text
										@click.prevent.stop="killAction(actionId)"
										@mousedown.stop
										@touchstart.native.stop
									>
										<v-icon>mdi-stop-circle</v-icon>
									</v-btn>
								</v-list-item-action>
							</v-list-item>
						</v-list-item-group>
					</v-list>
				</v-card-text>
				<v-card-actions style="overflow: auto">
					<v-btn small @click="startTerminal()">
						<v-icon right>mdi-console</v-icon>new shell
					</v-btn>
					<v-btn small @click="quickCommand('_exit')">kill process</v-btn>
					<v-btn small @click="quickCommand('_restart')">restart process</v-btn>
					<v-btn small @click="quickCommand('_shutdown')">shutdown</v-btn>
					<v-btn small @click="quickCommand('_reboot')">reboot</v-btn>
					<v-btn small @click="quickCommand('_lock')">lock</v-btn>
				</v-card-actions>
			</v-card>

			<v-dialog v-model="terminalDialog" width="unset">
				<div id="xterm" style="height: 510px"></div>
				<v-btn id="terminalCloseButton" text dark @click="terminalDialog = false">close</v-btn>
			</v-dialog>

			<v-card v-for="({task, actions}, taskId) in tasks" :key="taskId" class="mt-2">
				<v-card-title v-ripple @click="toggleCollapsedState(taskId)" style="cursor: pointer">
					{{ task.label }}
					<span class="grey--text ml-1" v-if="task.label != taskId">{{ taskId }}</span>
					<v-btn small text fab @click="refreshTasks()">
						<v-icon>mdi-refresh</v-icon>
					</v-btn>
					<v-btn small text fab @click="startTerminal(task.path)">
						<v-icon>mdi-console</v-icon>
					</v-btn>
				</v-card-title>
				<v-expand-transition>
					<v-card-text v-show="getCollapsedState(taskId)">
						<v-list>
							<v-list-item-group v-for="(actions, prefix) in actions" :key="prefix">
								<v-subheader v-if="prefix != ''" class="headline black--text">{{ prefix }}</v-subheader>
								<v-list-item v-for="action in actions" :key="action.name">
									<v-list-item-avatar>
										<v-icon>{{ getActionIcon(action.label) }}</v-icon>
										<template v-if="action.globalId in connection.runningActions">
											<v-progress-circular
												color="error"
												value="100"
												v-if="connection.runningActions[action.globalId].exitCode != 0"
												class="progress-float"
											></v-progress-circular>
											<v-progress-circular color="primary" indeterminate v-else class="progress-float"></v-progress-circular>
										</template>
									</v-list-item-avatar>
									<v-list-item-content @click="runAction(action.globalId)">
										{{ action.label }}
										<span
											class="grey--text"
											v-if="action.label != action.name"
										>{{ action.name }}</span>
									</v-list-item-content>
								</v-list-item>
							</v-list-item-group>
						</v-list>
					</v-card-text>
				</v-expand-transition>
			</v-card>
		</template>
	</v-container>
	<v-progress-circular indeterminate color="primary" class="ma-auto" v-else></v-progress-circular>
</template>

<style>
	.v-dialog {
		position: relative;
		overflow: visible;
	}

	#xterm {
		width: 1160px;
	}

	@media screen and (max-width: 1160px) {
		#xterm {
			width: 100vw;
		}
	}

	#terminalCloseButton {
		position: absolute;
		right: 0;
		bottom: -34px;
		height: 30px;
		width: 50px;
	}

	.progress-float {
		position: absolute;
		top: 4px;
		left: 4px;
	}
</style>

<script lang="ts">
	import Vue from 'vue'
	import { db, authStore } from "../firebase"
	import { IClientDocument, IAction, ITask } from "../../../common/types"
	import { connections, updateConnections, requestActionKill, requestStartTerminal, IConnection, IFrontendRunningAction, sendData, subscribeTo, quickCommand, requestRefreshTasks, requestStartAction } from "../connections"
	import StatusIndicator from "../components/StatusIndicator.vue"
	import firebase from "firebase/app"
	import router from '../router'
	import { Terminal } from "xterm"
	import "xterm/css/xterm.css"

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
			deleteDialog: false,
			terminalDialog: false,
			terminalTarget: "",
			terminal: null as Terminal | null,
			terminalLastLine: 0,
			actionIcons: {
				"start": "mdi-play-circle",
				"serve": "mdi-access-point-network",
				"build": "mdi-wrench",
				"deploy": "mdi-cloud-upload",
				"shell": "mdi-console",
				"publish": "mdi-publish",
				"firebase": "mdi-firebase",
				"test": "mdi-test-tube",
				"log": "mdi-text-box-outline",
				"logs": "mdi-text-box-outline",
				"pull": "mdi-folder-download"
			} as { [index: string]: string },
			collapsedState: {} as { [index: string]: boolean }
		}),
		mounted(this: Vue & { terminal: Terminal } & { [index: string]: any }) {
			this.$bind("client", db.collection("clients").doc(this.clientId))
			// @ts-ignore
			window["clientView"] = this
		},
		props: {
			clientId: String
		},
		computed: {
			connection(this: any) {
				return this.connections[this.clientId] as IConnection
			},
			tasks() {
				if (!this.connection) return {}
				var ret = {} as { [index: string]: { actions: { [index: string]: (IAction & { globalId: string })[] }, task: ITask } }
				// @ts-ignore Because ITask is not apparently assignable to unknown
				Object.values(this.connection.tasks).forEach((task: ITask) => {
					ret[task.id] = { task, actions: {} }
					let target = ret[task.id].actions

					task.actions.forEach((v: IAction) => {
						var split = v.name.lastIndexOf("/")
						var prefix = v.name.substr(0, split)

						if (!(prefix in target)) target[prefix] = []
						target[prefix].push({ ...v, globalId: task.id + "@" + v.name })
					})
				})

				return ret
			}
		},
		watch: {
			client() {
				updateConnections([this.client])
			},
			connections: {
				handler() {
					if (this.connections[this.clientId].state != "online") {
						this.terminal = null
						this.terminalDialog = false
						this.terminalTarget = ""
					} else if (this.terminal && !(this.terminalTarget in this.connections[this.clientId].runningActions)) {
						this.terminal = null
						this.terminalDialog = false
						this.terminalTarget = ""
					} else if (this.terminal) {
						var action = this.connections[this.clientId].runningActions[this.terminalTarget] as IFrontendRunningAction

						while (action.history.length > this.terminalLastLine) {
							this.terminal.write(action.history[this.terminalLastLine])
							this.terminalLastLine++
						}
					}
				},
				deep: true
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
			quickCommand(command: string) {
				quickCommand(connections[this.clientId], command)
			},
			startTerminal(cwd: string | true = true) {
				requestStartTerminal(connections[this.clientId], cwd)
			},
			refreshTasks() {
				requestRefreshTasks(connections[this.clientId])
			},
			runAction(name: string) {
				if (!(name in connections[this.clientId].runningActions))
					requestStartAction(connections[this.clientId], name)
				else
					this.openXterm(name)
			},
			openXterm(action: string) {
				this.terminal = new Terminal({
					cols: 145,
					rows: 30,
					convertEol: true
				})

				this.terminalDialog = true
				this.terminalTarget = action

				var startTime = Date.now()
				var open = () => {
					var termDiv = document.getElementById("xterm") as HTMLDivElement
					if (!termDiv) {
						if (this.terminal) {
							if (Date.now() - startTime < 100) {
								this.$nextTick(open)
							} else {
								throw new Error("Failed to find element for xterm")
							}
						}
					} else {
						this.$nextTick(() => {

						})
					}
				}

				setTimeout(() => {
					var termDiv = document.getElementById("xterm") as HTMLDivElement
					termDiv.childNodes.forEach(v => v.remove())
					if (this.terminal) {
						this.terminal.open(termDiv)
						this.terminal.onData((data) => {
							sendData(this.connections[this.clientId], this.terminalTarget, data)
						})

						var term = this.terminal as Terminal
						var connection = this.connections[this.clientId] as IConnection
						var targetAction = connection.runningActions[action]
						term.clear()
						this.terminalLastLine = 0
					}
				}, 200)
				open()
				subscribeTo(this.connections[this.clientId], action)
			},
			getActionIcon(label: string) {
				var labelParts = label.split(/\/|\s/g)
				var icon = this.actionIcons[labelParts[labelParts.length - 1].toLowerCase()] as string
				return icon ?? "mdi-help"
			},
			changeClientName() {
				db.collection("clients").doc(this.clientId).update({
					name: this.client.name
				})
			},
			toggleCollapsedState(id: string) {
				var set = true
				if (id in this.collapsedState) {
					set = this.collapsedState[id] = !this.collapsedState[id]
				} else {
					Vue.set(this.collapsedState, id, !this.getCollapsedState(id))
				}
				localStorage.setItem("taskCollapse_" + this.clientId + "_" + id, set.toString())
			},
			getCollapsedState(id: string) {
				return this.collapsedState[id] ?? localStorage.getItem("taskCollapse_" + this.clientId + "_" + id) == "true"
			}
		}

	})
</script>