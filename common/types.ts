
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

export const ACCESS_TOKEN_LENGHT = 256

export const WEBSOCKET_PROTOCOL = "system-control-app"