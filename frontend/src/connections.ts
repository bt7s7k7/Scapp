import { IClientDocument, WEBSOCKET_PROTOCOL } from "../../common/types"
import Vue from "vue"

export interface IConnection {
    state: "connecting" | "offline" | "online",
    websocket: WebSocket | null,
    url: string,
    id: string
}

export const connections = {} as { [index: string]: IConnection }

function createConnection(client: IClientDocument & { id: string }) {
    let connection = {
        state: "connecting",
        id: client.id,
        url: client.url
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
        })
        websocket.addEventListener("close", () => {
            Vue.set(connection, "state", "offline")
            Vue.set(connection, "websocket", null)
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