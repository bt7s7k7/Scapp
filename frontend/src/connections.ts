import { IClientDocument, WEBSOCKET_PROTOCOL } from "../../common/types"

export interface IConnection {
    active: boolean,
    websocket: WebSocket | null,
    url: string,
    id: string
}

export const connections = {} as { [index: string]: IConnection }

function createConnection(client: IClientDocument & { id: string }) {
    let connection = {
        active: false,
        id: client.id,
        url: client.url
    } as IConnection

    connection.websocket = createWebsocket(client, connection)

    return connection
}

function createWebsocket(client: IClientDocument & { id: string }, connection: IConnection) {
    let url = client.url


    let websocket = null as WebSocket | null
    try {
        websocket = new WebSocket(url, WEBSOCKET_PROTOCOL)
    } catch {
        connection.active = false
        connection.websocket = null
    }

    if (websocket) {
        websocket.addEventListener("error", () => {
            connection.active = false
            connection.websocket = null
        })
        websocket.addEventListener("open", () => {
            connection.active = true
        })
        websocket.addEventListener("close", () => {
            connection.active = false
            connection.websocket = null
        })

        connection.websocket = websocket
    }
}

export function updateConnections(clients: (IClientDocument & { id: string })[]) {
    for (let client of clients) {
        if (!(client.id in connections)) {
            connections[client.id] = createConnection(client)
        } else {
            let connection = connections[client.id]

            if (!connection.active && connection.url != client.url) {
                connection.url = client.url
                createWebsocket(client, connection)
            }
        }
    }
}