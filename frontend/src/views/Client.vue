<template>
	<v-container class="my-5" v-if="!('loading' in $data) && connection">
		<!-- Database edit card -->
		<v-card class="mx-auto">
			<!-- Client name -->
			<v-card-title primary-title>
				<input class="display-3" v-model="client.name" @change="changeClientName()" style="width: 100%" />
			</v-card-title>
			<v-card-actions>
				<status-indicator :status="connection.state"></status-indicator>
				<span class="grey--text mr-2">{{ connection.url }}</span>
				<lan-url-buttons
					class="hidden-xs-only"
					:connection="connection"
					:client="client"
					:clientId="clientId"
					:realClientId="realClientId"
					ref="buttons"
				></lan-url-buttons>
				<v-spacer></v-spacer>
				<v-menu offset-y>
					<template v-slot:activator="{ on }">
						<v-btn fab small text v-on="on" class="hidden-sm-and-up">
							<v-icon>mdi-lan</v-icon>
						</v-btn>
					</template>
					<lan-url-buttons
						:connection="connection"
						:client="client"
						:clientId="clientId"
						:realClientId="realClientId"
						ref="buttons"
						lines
						style="background-color: white"
					></lan-url-buttons>
				</v-menu>
				<!-- Allowed users dialog -->
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
							<v-list height="70vh" class="scrolling-list">
								<v-list-item-group>
									<!-- Allowed user list item -->
									<v-list-item v-for="{ email, id } in allowedUsers" :key="id">
										<v-list-item-content>
											<v-list-item-title>
												<span :class="id == authStore.currentUser.uid ? 'green--text' : ''">{{ email }}</span>
											</v-list-item-title>
											<span class="grey--text">{{id}}</span>
										</v-list-item-content>
										<!-- Remove button, make sure to not let the user delete themselves -->
										<v-list-item-action v-if="allowedUsers.length > 1 && id != authStore.currentUser.uid">
											<v-btn fab text small @click="removeUser(id)">
												<v-icon>mdi-account-remove</v-icon>
											</v-btn>
										</v-list-item-action>
									</v-list-item>
								</v-list-item-group>
							</v-list>
						</v-card-text>
						<v-card-actions>
							<!-- User add dialog -->
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
											<v-text-field
												name="userId"
												label="User ID"
												id="userId"
												v-model="userIdToAdd"
												:error-messages="addUserError"
											></v-text-field>
										</v-card-text>
										<v-card-actions>
											<!-- Loading indicator -->
											<v-progress-circular indeterminate color="primary" v-if="addUserLoading"></v-progress-circular>
											<v-spacer></v-spacer>
											<v-btn text @click="addUser(userIdToAdd);" type="submit">add</v-btn>
											<v-btn text @click="userAddDialog = false; userIdToAdd = ''">cancel</v-btn>
										</v-card-actions>
									</v-form>
								</v-card>
							</v-dialog>
							<!-- Loading indicator -->
							<v-progress-circular indeterminate color="primary" v-if="addUserLoading"></v-progress-circular>
							<v-spacer></v-spacer>
							<v-btn text @click.native="usersDialog = false">close</v-btn>
						</v-card-actions>
					</v-card>
				</v-dialog>
				<!-- Client delete confirm dialog -->
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
							<code>scapp init</code>.
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
		<!-- All cards that need a websocket connection are here -->
		<template v-if="connections[client.id] && connections[client.id].state == 'online'">
			<!-- Running actions card -->
			<v-card class="mt-2">
				<v-card-title primary-title>Actions</v-card-title>
				<v-card-text>
					<v-list>
						<v-list-item-group>
							<!-- Running action list item -->
							<v-list-item
								v-for="(action, actionId) in connection.runningActions"
								:key="actionId"
								@click="openXterm(actionId, 'action')"
							>
								<!-- Error indicator -->
								<v-list-item-avatar v-if="action.exitCode != 0">
									<v-icon color="error">mdi-alert</v-icon>
								</v-list-item-avatar>
								<!-- Running indicator -->
								<v-list-item-avatar v-else-if="actionId != '_internal@log'">
									<!-- Don't show a running indicator for log -->
									<v-progress-circular color="primary" indeterminate class="progress-float"></v-progress-circular>
								</v-list-item-avatar>
								<v-list-item-content class="pa-0">
									<span>{{ action.label }}</span>
									<span class="grey--text">{{actionId}}</span>
								</v-list-item-content>
								<!-- Kill button, also not shown for log -->
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
				<!-- Quick actions -->
				<v-card-actions>
					<!-- For medium and down we show only icons to be mobile friendly -->
					<v-btn class="hidden-lg-and-up" small @click="startTerminal()" text fab>
						<v-icon>mdi-console</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="quickCommand('_exit')">
						<v-icon>mdi-stop-circle</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="quickCommand('_restart')">
						<v-icon>mdi-file-restore</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="quickCommand('_shutdown')">
						<v-icon>mdi-power</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="quickCommand('_reboot')">
						<v-icon>mdi-restart</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="quickCommand('_lock')">
						<v-icon>mdi-lock</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="startupActionsDialog = true">
						<v-icon>mdi-playlist-play</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="requestLogs(); logsDialog = true">
						<v-icon>mdi-file-clock</v-icon>
					</v-btn>
					<v-btn class="hidden-lg-and-up" small text fab @click="fileExplorerDialog = true">
						<v-icon>mdi-folder</v-icon>
					</v-btn>
					<!-- For large and up show also text -->
					<v-btn class="hidden-md-and-down" small @click="startTerminal()">
						<v-icon left>mdi-console</v-icon>New shell
					</v-btn>
					<v-btn class="hidden-md-and-down" small @click="quickCommand('_exit')">
						<v-icon left>mdi-stop-circle</v-icon>Terminate
					</v-btn>
					<v-btn class="hidden-md-and-down" small @click="quickCommand('_restart')">
						<v-icon left>mdi-file-restore</v-icon>Reinit
					</v-btn>
					<v-btn class="hidden-md-and-down" small @click="quickCommand('_shutdown')">
						<v-icon left>mdi-power</v-icon>Shutdown
					</v-btn>
					<v-btn class="hidden-md-and-down" small @click="quickCommand('_reboot')">
						<v-icon left>mdi-restart</v-icon>Reboot
					</v-btn>
					<v-btn class="hidden-md-and-down" small @click="quickCommand('_lock')">
						<v-icon left>mdi-lock</v-icon>Lock
					</v-btn>
					<v-btn class="hidden-md-and-down" small @click="startupActionsDialog = true">
						<v-icon left>mdi-playlist-play</v-icon>Startup
					</v-btn>
					<v-btn class="hidden-md-and-down" small @click="requestLogs(); logsDialog = true">
						<v-icon left>mdi-file-clock</v-icon>Logs
					</v-btn>
                    <v-btn class="hidden-md-and-down" small @click="fileExplorerDialog = true">
						<v-icon left>mdi-folder</v-icon>File explorer
					</v-btn>
					<!-- Startup actions dialog -->
					<v-dialog v-model="startupActionsDialog" max-width="500px">
						<v-card>
							<v-card-title primary-title>Startup actions</v-card-title>
							<v-card-text>
								<v-list height="70vh" class="scrolling-list">
									<v-list-item-group>
										<!-- Startup action -->
										<v-list-item v-for="action in connection.startupActions" :key="action">
											<v-list-item-content>
												<v-list-item-title>{{ action }}</v-list-item-title>
											</v-list-item-content>
											<!-- Remove button -->
											<v-list-item-action>
												<v-btn fab text small @click="removeStartupAction(action)">
													<v-icon>mdi-minus-circle</v-icon>
												</v-btn>
											</v-list-item-action>
										</v-list-item>
									</v-list-item-group>
								</v-list>
							</v-card-text>
							<v-card-actions>
								<v-btn text @click="startupActionsDialog = false">close</v-btn>
							</v-card-actions>
						</v-card>
					</v-dialog>
					<!-- Logs dialog -->
					<v-dialog v-model="logsDialog" max-width="700">
						<v-card>
							<v-card-title primary-title>Logs</v-card-title>
							<v-card-text>
								<v-list class="scrolling-list" height="70vh">
									<v-list-item-group>
										<!-- Log list item, opens the terminal with log mode -->
										<v-list-item v-for="{name, id, date} in logs" :key="id" @click="openXterm(id, 'log')">
											<v-list-item-content>
												{{ name }}
												<span class="grey--text">{{ date }}</span>
											</v-list-item-content>
										</v-list-item>
									</v-list-item-group>
								</v-list>
							</v-card-text>
							<v-card-actions>
								<v-spacer></v-spacer>
								<v-btn text @click="logsDialog = false">close</v-btn>
							</v-card-actions>
						</v-card>
					</v-dialog>
					<!-- File explorer dialog -->
					<v-dialog v-model="fileExplorerDialog">
						<file-explorer :connection="connection"></file-explorer>
					</v-dialog>
				</v-card-actions>
			</v-card>
			<!-- Terminal dialog -->
			<v-dialog
				:value="terminalDialog != 'none'"
				@click:outside="terminalDialog = 'none'"
				width="unset"
			>
				<!-- Terminal container, the terminal is created from openXterm method -->
				<div id="xterm" style="height: 510px"></div>
				<!-- These buttons are absolutely positioned under the dialog -->
				<v-btn id="terminalCloseButton" text dark @click="terminalDialog = 'none'">close</v-btn>
				<v-btn
					id="terminalCloseButton"
					style="right: 70px"
					text
					dark
					@click="killAction(terminalTarget)"
					v-if="terminalDialog == 'action'"
				>kill</v-btn>
				<!-- Loading indicator, absolutely positioned in the center of this dialog, only shows when the terminal is loading -->
				<v-progress-circular
					indeterminate
					color="primary"
					id="terminalLoadSpinner"
					v-if="terminalLoading"
				></v-progress-circular>
			</v-dialog>
			<!-- Task cards -->
			<v-card v-for="({task, actions}, taskId) in tasks" :key="taskId" class="mt-2">
				<!-- Clicking on the title toggles the collapsed state -> if the content shows -->
				<v-card-title v-ripple @click="toggleCollapsedState(taskId)" style="cursor: pointer">
					<template v-if="task.icon.length > 0">
						<v-icon v-if="task.icon.substr(0, 4) == 'mdi-'" class="mr-2" large>{{ task.icon }}</v-icon>
						<v-img v-else contain max-height="40" max-width="40" :src="task.icon"></v-img>
					</template>
					{{ task.label }}
					<span class="grey--text ml-1" v-if="task.label != taskId">{{ taskId }}</span>
					<v-btn small text fab @click="refreshTasks()">
						<v-icon>mdi-refresh</v-icon>
					</v-btn>
					<v-btn small text fab @click="startTerminal(task.path)">
						<v-icon>mdi-console</v-icon>
					</v-btn>
				</v-card-title>
				<!-- Taks actions, only show when the task is expanded -->
				<v-expand-transition>
					<v-card-text v-show="getCollapsedState(taskId)">
						<v-list>
							<!-- The actions are grouped by prefix, ie. firebase/functions/build has prefix firebase/functions -->
							<v-list-item-group v-for="(actions, prefix) in actions" :key="prefix">
								<!-- Prefix name -->
								<v-subheader v-if="prefix != ''" class="headline black--text">{{ prefix }}</v-subheader>
								<!-- Actions in the prefix -->
								<v-list-item v-for="action in actions" :key="action.name">
									<v-list-item-avatar>
										<v-icon>{{ getActionIcon(action.label) }}</v-icon>
										<!-- The progress shows the action is running, absolutely positioned in the center of the action avatar -->
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
									<!-- Clicking the action will start it, if it's started a terminal will open for it -->
									<v-list-item-content @click="runAction(action.globalId)">
										{{ action.label }}
										<span
											class="grey--text"
											v-if="action.label != action.name"
										>{{ action.name }}</span>
									</v-list-item-content>
									<v-list-item-action>
										<!-- Startup action setting -->
										<v-btn
											small
											text
											fab
											color="success"
											v-if="connection.startupActions.includes(action.globalId)"
											@click="removeStartupAction(action.globalId)"
										>
											<v-icon>mdi-playlist-play</v-icon>
										</v-btn>
										<v-btn small text fab color="grey" v-else @click="addStartupAction(action.globalId)">
											<v-icon>mdi-playlist-play</v-icon>
										</v-btn>
									</v-list-item-action>
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
	/* Made for the terminal dialog buttons, they need a absolute position */
	.v-dialog {
		position: relative;
		overflow: visible;
	}

	#xterm {
		width: 1160px;
	}
	/* Make sure the terminal is not wider than the screen */
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

	#terminalLoadSpinner {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: center center;
	}

	.scrolling-list {
		overflow: auto;
	}

    .file-explorer-list {
        height: 70vh
    }
</style>

<script lang="ts">
	import Vue from 'vue'
	import { db, authStore, functions } from "../firebase"
	import { IClientDocument, IAction, ITask } from "../../../common/types"
	import { connections, updateConnections, requestActionKill, requestStartTerminal, IConnection, IFrontendRunningAction, sendData, subscribeTo, quickCommand, requestRefreshTasks, requestStartAction, requestStartupActions, addStartupAction, removeStartupAction, requestLogs, getLogContent } from "../connections"
	import StatusIndicator from "../components/StatusIndicator.vue"
	import firebase from "firebase/app"
	import router from '../router'
	import { Terminal } from "xterm"
	import LanUrlButtons from "../components/LanUrlButtons.vue"
    import "xterm/css/xterm.css"
    import FileExplorer from "../components/FileExplorer.vue"

	type TerminalTargetType = "none" | "action" | "log"

	interface LogFile {
		date: string
		name: string
		id: string
		now: number
	}

	export default Vue.extend({
		name: "Client",
		components: {
			StatusIndicator,
            LanUrlButtons,
            FileExplorer
		},
		data: () => ({
			client: { loading: true } as IClientDocument & { id: string, loading: true | null },
			connections,
			usersDialog: false,
			userAddDialog: false,
			userIdToAdd: "",
			authStore,
			deleteDialog: false,
			terminalDialog: "none" as TerminalTargetType,
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
			collapsedState: {} as { [index: string]: boolean },
			startupActionsDialog: false,
			logs: [] as LogFile[],
			logsDialog: false,
			lastLogText: "",
			terminalLoading: false,
			allowedUsers: [] as { id: string, email: string }[],
			addUserLoading: false,
			addUserError: "",
			realClientId: "",
			fileExplorerDialog: false
		}),
		mounted(this: Vue & { terminal: Terminal } & { [index: string]: any }) {
			this.$bind("client", db.collection("clients").doc(this.realClientId))
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
				this.refreshAllowedUsers()
			},
			connections: {
				handler() {
					if (!this.connection || this.connection.state != "online") {
						this.terminal = null
						this.terminalDialog = "none"
						this.terminalTarget = ""
					} else if (this.terminal) {
						if (this.terminalDialog == "action") {
							// If the terminal is targeting an action that's not running close it
							if (!(this.terminalTarget in this.connection.runningActions)) {
								this.terminal = null
								this.terminalDialog = "none"
								this.terminalTarget = ""
							} else {
								var action = this.connection.runningActions[this.terminalTarget] as IFrontendRunningAction
								// Write all unwritten lines from history to term
								while (action.history.length > this.terminalLastLine) {
									this.terminal.write(action.history[this.terminalLastLine])
									this.terminalLastLine++
									this.terminalLoading = false
								}
							}
						} else if (this.terminalDialog == "log") {
							if (this.terminalTarget in this.connection.logs) {
								// Write the log content to the term
								let text = this.connection.logs[this.terminalTarget]
								if (text != this.lastLogText) {
									this.terminal.clear()
									this.terminal.write(text)
									this.lastLogText = text
									this.terminalLoading = false
								}
							}
						} else { // If the terminal type is any other, just close it
							this.terminal = null
							this.terminalDialog = "none"
							this.terminalTarget = ""
						}
					}
					// Create list of logs for the dialog
					if (this.connection) this.logs = this.connection.logList.map((filename: string) => {
						var [name, now] = filename.split("`")
						var date = new Date(parseInt(now))

						return {
							id: filename,
							now: date.getTime(),
							name,
							date: `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
						} as LogFile
					}).sort((a, b) => b.now - a.now)
				},
				deep: true
			},
			terminalDialog() { // When the terminal is closed clean up
				if (this.terminalDialog == "none") {
					// This is needed because if it stays and the user
					// opens the same log again, the function will detect
					// that this and the content inside the connection is
					// the same and not write anything to the terminal
					//  causing it to be blank
					this.lastLogText = ''

					// Remove the old terminal element
					this.terminal?.element?.remove()
				}
			},
			clientId: {
				immediate: true,
				handler() {
					// Can't use a computed value because then vue will throw up all kind of nonsense
					this.realClientId = this.clientId.split("!")[0]
				}
			}
		},
		methods: {
			addUser(userId: string) {
				this.changeUsers([userId], [])
			},
			changeUsers(add: string[], remove: string[]) {
				this.addUserError = ""
				this.addUserLoading = true
				functions.httpsCallable("changeClientAllowedUsers")({
					id: this.client.id,
					accessToken: this.client.accessToken,
					add,
					remove
				}).then(v => {
					if (v.data.success) {
						this.addUserLoading = false
						this.userAddDialog = false
					}
				}).catch(v => {
					this.addUserLoading = false
					// @ts-ignore Type any cannot index any
					this.addUserError = {
						"not-found": "User not found"
					}[v.code] ?? v.code
				})
			},
			removeUser(userId: string) {
				this.changeUsers([], [userId])
			},
			deleteClient() {
				db.collection("clients").doc(this.realClientId).delete()
				router.push("/")
			},
			killAction(id: string) {
				requestActionKill(this.connection, id)
			},
			quickCommand(command: string) {
				quickCommand(this.connection, command)
			},
			addStartupAction(action: string) {
				addStartupAction(this.connection, action)
			},
			removeStartupAction(action: string) {
				removeStartupAction(this.connection, action)
			},
			getStartupActions() {
				requestStartupActions(this.connection)
			},
			startTerminal(cwd: string | true = true) {
				requestStartTerminal(this.connection, cwd)
			},
			refreshTasks() {
				requestRefreshTasks(this.connection)
			},
			requestLogs() {
				requestLogs(this.connection)
			},
			runAction(name: string) {
				if (!(name in this.connection.runningActions))
					requestStartAction(this.connection, name)
				else // If the action is running already open a terminal for it
					this.openXterm(name, "action")
			},
			openXterm(action: string, type: TerminalTargetType) {
				this.terminal = new Terminal({
					cols: 145,
					rows: 30,
					convertEol: true
				})

				this.terminalDialog = type
				this.terminalTarget = action

				this.terminalLoading = true
				this.terminal.clear()
				// Waiting for the dialog to open fully before
				// opening the terminal, if not the terminal will
				// detect the wrong width when opening and it will
				// look wrong, smaller text and such
				setTimeout(() => {
					var termDiv = document.getElementById("xterm") as HTMLDivElement
					termDiv.childNodes.forEach(v => v.remove())
					if (this.terminal) {
						this.terminal.open(termDiv)
						this.terminal.onData((data) => {
							if (type == "action") sendData(this.connection, this.terminalTarget, data)
						})

						var term = this.terminal as Terminal
						var connection = this.connection as IConnection
						var targetAction = connection.runningActions[action]
						this.terminalLastLine = 0
					}
				}, 250)

				if (type == "action") subscribeTo(this.connection, action)
				else if (type == "log") getLogContent(this.connection, action)
			},
			getActionIcon(label: string) {
				// Splitting the label to get the last word, it will be used to index the actionIcons object in $data
				var labelParts = label.split(/\/|\s/g)
				var icon = this.actionIcons[labelParts[labelParts.length - 1].toLowerCase()] as string
				return icon ?? "mdi-help"
			},
			changeClientName() {
				db.collection("clients").doc(this.realClientId).update({
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
				localStorage.setItem("taskCollapse_" + this.realClientId + "_" + id, set.toString())
			},
			getCollapsedState(id: string) {
				return this.collapsedState[id] ?? localStorage.getItem("taskCollapse_" + this.realClientId + "_" + id) == "true"
			},
			refreshAllowedUsers() {
				functions.httpsCallable("getClientConfig")({
					id: this.client.id,
					accessToken: this.client.accessToken
				}).then((result: { data: { allowedUsers: string[], userEmails: string[] } }) => {
					if ("allowedUsers" in result.data) {
						this.allowedUsers = result.data.allowedUsers.map((v, i) => ({ id: v, email: result.data.userEmails[i] }))
					}
				})
			}
		}

	})
</script>