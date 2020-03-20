import { IClientDocument, WEBSOCKET_PROTOCOL, IFrontendRequest, IFrontendResponse, ITask } from "../../common/types"
import Vue from "vue"
import { authStore, auth } from './firebase'

export interface IFrontendRunningAction {
    history: string[]
    label: string
    name: string,
    exitCode: number
}

export interface IConnection {
    state: "connecting" | "offline" | "online",
    websocket: WebSocket | null,
    url: string,
    id: string,
    runningActions: {
        [index: string]: IFrontendRunningAction
    },
    verified: boolean,
    tasks: { [index: string]: ITask },
    startupActions: string[],
    logs: {[index: string]: string},
    logList: string[]
}

export const connections = {} as { [index: string]: IConnection }

function createConnection(client: IClientDocument & { id: string }) {
    let connection = {
        state: "connecting",
        id: client.id,
        url: client.url,
        runningActions: {},
        verified: false,
        tasks: {},
        startupActions: [],
        websocket: null,
        logs: {},
        logList: []
    } as IConnection

    createWebsocket(client, connection)

    return connection
}

function createWebsocket(client: IClientDocument & { id: string }, connection: IConnection) {
    let url = client.url


    let websocket = null as WebSocket | null
    try {
        websocket = new WebSocket(url, WEBSOCKET_PROTOCOL)
    } catch {
        Vue.set(connection, "state", "offline")
        Vue.set(connection, "websocket", null)
    }

    if (websocket) {
        websocket.addEventListener("error", () => {
            Vue.set(connection, "state", "offline")
            Vue.set(connection, "websocket", null)
        })
        websocket.addEventListener("open", () => {
            Vue.set(connection, "state", "online")
            if (!authStore.currentUser) throw new Error("No current user")
            authStore.currentUser.getIdToken().then(token => {
                websocket?.send(JSON.stringify({
                    idToken: token
                } as IFrontendRequest))
            })
        })
        websocket.addEventListener("close", () => {
            Vue.set(connection, "state", "offline")
            Vue.set(connection, "websocket", null)
        })

        websocket.addEventListener("message", (event) => {
            var message = event.data
            var response = JSON.parse(message) as IFrontendResponse

            if (response.verified) {
                connection.verified = true
            }

            if (response.runningActions) {
                var sent = response.runningActions.map(v => {
                    var history = connection.runningActions[v.id]?.history
                    Vue.set(connection.runningActions, v.id, {
                        history: history ?? [],
                        label: v.label,
                        name: v.id,
                        exitCode: v.exitCode
                    } as IFrontendRunningAction)
                    return v.id
                })

                Object.keys(connection.runningActions).filter(v => sent.indexOf(v) == -1).forEach(v => Vue.delete(connection.runningActions, v))
            }

            if (response.err) {
                console.error("Client error: " + response.err)
            }

            if (response.actionTerminalHistory) {
                var targetAction = connection.runningActions[response.actionTerminalHistory.id]
                if (targetAction) {
                    Vue.set(connection.runningActions[response.actionTerminalHistory.id], "history", [response.actionTerminalHistory.history])
                }
            }

            if (response.actionTerminalOut) {
                var targetAction = connection.runningActions[response.actionTerminalOut.id]
                if (targetAction) {
                    connection.runningActions[response.actionTerminalOut.id].history.push(response.actionTerminalOut.line)
                }
            }

            if (response.tasks) {
                Vue.set(connection, "tasks", response.tasks)
            }

            if (response.startupActions) {
                Vue.set(connection, "startupActions", response.startupActions)
            }

            if (response.logContent) {
                Vue.set(connection.logs, response.logContent.id, response.logContent.content)
            }

            if (response.logs) {
                Vue.set(connection, "logList", response.logs)
            }
        })

        Vue.set(connection, "websocket", websocket)
    }
}

export function updateConnections(clients: (IClientDocument & { id: string })[]) {
    for (let client of clients) {
        if (!(client.id in connections)) {
            Vue.set(connections, client.id, createConnection(client))
        } else {
            let connection = connections[client.id]

            if (connection.state == "offline" && connection.url != client.url) {
                Vue.set(connection, "url", client.url)
                createWebsocket(client, connection)
            }
        }
    }
}

export function requestActionKill(connection: IConnection, actionName: string) {
    connection.websocket?.send(JSON.stringify({ killAction: actionName } as IFrontendRequest))
}

export function requestStartAction(connection: IConnection, actionName: string) {
    connection.websocket?.send(JSON.stringify({ startAction: actionName } as IFrontendRequest))
}

export function requestStartTerminal(connection: IConnection, cwd: string | true = true) {
    connection.websocket?.send(JSON.stringify({ startTerminal: cwd } as IFrontendRequest))
}

export function requestRefreshTasks(connection: IConnection) {
    connection.websocket?.send(JSON.stringify({ rescanTasks: true } as IFrontendRequest))
}

export function sendData(connection: IConnection, actionName: string, data: string) {
    connection.websocket?.send(JSON.stringify({ sendInput: { data, id: actionName } } as IFrontendRequest))
}

export function subscribeTo(connection: IConnection, actionName: string) {
    connection.websocket?.send(JSON.stringify({ subscribe: actionName } as IFrontendRequest))
}

export function quickCommand(connection: IConnection, command: string) {
    connection.websocket?.send(JSON.stringify({ quickCommand: command } as IFrontendRequest))
}

export function addStartupAction(connection: IConnection, action: string) {
    connection.websocket?.send(JSON.stringify({ addStartupAction: action } as IFrontendRequest))
}

export function removeStartupAction(connection: IConnection, action: string) {
    connection.websocket?.send(JSON.stringify({ removeStartupAction: action } as IFrontendRequest))
}

export function requestStartupActions(connection: IConnection) {
    connection.websocket?.send(JSON.stringify({ getStartupActions: true } as IFrontendRequest))
}

export function requestLogs(connection: IConnection) {
    connection.websocket?.send(JSON.stringify({ getLogs: true } as IFrontendRequest))
}

export function getLogContent(connection: IConnection, id: string) {
    connection.websocket?.send(JSON.stringify({ readLog: id } as IFrontendRequest))
}