
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

export const ACCESS_TOKEN_LENGHT = 256