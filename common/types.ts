
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
    taskPaths: string[],
    clonePath: string,
    startupActions: string[]
}

export interface IFrontendRequest {
    listRunning: boolean,
    startTerminal: string | boolean,
    idToken: string,
    subscribe: string,
    killAction: string,
    sendInput: {
        id: string,
        data: string
    },
    quickCommand: string,
    rescanTasks: boolean,
    startAction: string,
    getStartupActions: boolean,
    addStartupAction: string,
    removeStartupAction: string,
    readLog: string,
    getLogs: boolean,
    readdir: string,
    unlink: string,
    putFile: {
        path: string,
        content: string
    },
    getFile: string
}

export interface IRunningActionInfo {
    id: string,
    label: string,
    exitCode: number
}

export interface IFile {
    name: string,
    size: number,
    isDirectory: boolean,
    path: string
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
    },
    tasks: { [index: string]: ITask },
    startupActions: string[],
    logs: [],
    logContent: {
        id: string,
        content: string
    },
    interfaces: string[],
    directory: {
        files: IFile[],
        path: string
    },
    fileContent: {
        name: string,
        content: string
    }
}

export interface IAction {
    name: string,
    command: string,
    cwd: string,
    env: { [index: string]: string }
    label: string
}

export interface ITask {
    id: string,
    label: string,
    actions: IAction[],
    path: string,
    icon: string
}

export const ACCESS_TOKEN_LENGHT = 256

export const WEBSOCKET_PROTOCOL = "system-control-app"