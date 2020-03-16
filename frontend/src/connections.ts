import { IClientDocument, WEBSOCKET_PROTOCOL, IFrontendRequest, IFrontendResponse } from "../../common/types"
import Vue from "vue"
import { authStore, auth } from './firebase'

interface IFrontendRunningAction {
    history: string[]
    label: string
    name: string
}

export interface IConnection {
    state: "connecting" | "offline" | "online",
    websocket: WebSocket | null,
    url: string,
    id: string,
    runningActions: {
        [index: string]: IFrontendRunningAction
    },
    verified: boolean
}

export const connections = {} as { [index: string]: IConnection }

function createConnection(client: IClientDocument & { id: string }) {
    let connection = {
        state: "connecting",
        id: client.id,
        url: client.url,
        runningActions: {},
        verified: false
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
                Vue.set(connection, "runningActions", {})
                Object.values(response.runningActions).forEach(v=>{
                    Vue.set(connection.runningActions, v.id, {
                        history: [],
                        label: v.label,
                        name: v.id
                    } as IFrontendRunningAction)
                })
            }

            if (response.err) {
                console.error("Client error: " + response.err)
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

export function requestStartTerminal(connection: IConnection) {
    connection.websocket?.send(JSON.stringify({ startTerminal: true } as IFrontendRequest))
}