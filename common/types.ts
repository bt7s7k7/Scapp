
export interface IClientDocument {
    name: string,
    allowedUsers: string[],
    url: string,
    accessToken: string
}

export interface IClientRegisterInfo {
    accessToken: string,
    id: string
}

export interface IClientLocalConfig extends IClientRegisterInfo {
    
}

export interface IFrontendRequest {
    listRunning: boolean,
    startTerminal: boolean,
    idToken: string,
    subscribe: string,
    killAction: string,
    sendInput: {
        id: string,
        data: string
    },
    quickCommand: string
}

export interface IRunningActionInfo {
    id: string,
    label: string
}

export interface IFrontendResponse {
    err: string | null,
    runningActions: IRunningActionInfo[],
    actionTerminalOut: {
        id: string,
        line: string
    },
    verified: boolean,
    actionTerminalHistory: {
        id: string,
        history: string
    }
}

export const ACCESS_TOKEN_LENGHT = 256

export const WEBSOCKET_PROTOCOL = "system-control-app"